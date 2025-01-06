import {
  RAW,
  ITERATE_KEY,
  MAP_KEY_ITERATE_KEY,
  TriggerType,
  IterationMethodType,
} from './constants.js'
import { cleanup } from './utils.js'

const bucket = new WeakMap()

// 追踪依赖
export function track(target, key) {
  if (!activeEffectFn || !shouldTrack) return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key) // Set<() => void>
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffectFn)

  activeEffectFn.deps.push(deps)
}

// 触发副作用函数的重新执行
export function trigger(target, key, type, newValue) {
  const depsMap = bucket.get(target)
  if (!depsMap) return

  const effects = depsMap.get(key)
  const iterateEffects = depsMap.get(ITERATE_KEY)

  const effectsToRun = new Set()

  effects &&
    effects.forEach((effectFn) => {
      if (effectFn !== activeEffectFn) {
        effectsToRun.add(effectFn)
      }
    })

  if (
    type === TriggerType.ADD ||
    type === TriggerType.DELETE ||
    (type === TriggerType.SET && isMap(target))
  ) {
    iterateEffects &&
      iterateEffects.forEach((effectFn) => {
        if (effectFn !== activeEffectFn) {
          effectsToRun.add(effectFn)
        }
      })
  }

  if (
    (type === TriggerType.ADD || type === TriggerType.DELETE) &&
    isMap(target)
  ) {
    const iterateEffects = depsMap.get(MAP_KEY_ITERATE_KEY)
    iterateEffects &&
      iterateEffects.forEach((effectFn) => {
        if (effectFn !== activeEffectFn) {
          effectsToRun.add(effectFn)
        }
      })
  }

  if (type === TriggerType.ADD && Array.isArray(target)) {
    const lengthEffects = depsMap.get('length')
    lengthEffects &&
      lengthEffects.forEach((effectFn) => {
        if (effectFn !== activeEffectFn) {
          effectsToRun.add(effectFn)
        }
      })
  }

  if (Array.isArray(target) && key === 'length') {
    depsMap.forEach((effects, key) => {
      if (key >= newValue) {
        effects.forEach((effectFn) => {
          if (effectFn !== activeEffectFn) {
            effectsToRun.add(effectFn)
          }
        })
      }
    })
  }

  effectsToRun.forEach((effectFn) => {
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effectFn)
    } else {
      effectFn()
    }
  })
}

let activeEffectFn // 临时存需要被注册的副作用函数
const effectFnStack = [] // 副作用函数栈，为了解决嵌套 effect 的问题

// 副作用函数注册函数
export function effect(effectFn, options = {}) {
  const fn = () => {
    cleanup(effectFn)
    activeEffectFn = effectFn
    effectFnStack.push(effectFn)
    const res = effectFn()
    effectFnStack.pop()
    activeEffectFn = effectFnStack[effectFnStack.length - 1]
    return res
  }
  effectFn.options = options
  effectFn.deps = [] // 函数也是对象哦
  if (!options.lazy) {
    fn() // 如果没传 lazy，立即执行
  }
  return fn // 如果传了 lazy，将加工后的副作用函数返回等待手动调用
}

// 重写的数组方法
const arrayInstrumentations = {}

// 查找方法：includes、indexOf、lastIndexOf
;['includes', 'indexOf', 'lastIndexOf'].forEach((method) => {
  const originMethod = Array.prototype[method] // 拿出原方法，使得引用不变
  arrayInstrumentations[method] = function (...args) {
    let res = originMethod.apply(this, args)
    if (res === false) {
      res = originMethod.apply(this[RAW], args)
    }
    return res
  }
})

let shouldTrack = true

;['push', 'pop', 'shift', 'unshift'].forEach((method) => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function (...args) {
    shouldTrack = false
    let res = originMethod.apply(this, args)
    shouldTrack = true
    return res
  }
})

// 对于 Map & Set 类型的方法重写
const mutableInstrumentations = {
  add(key) {
    const target = this[RAW]
    const hadKey = target.has(key)
    const rawValue = key[RAW] || key
    const res = target.add(rawValue)
    if (!hadKey) {
      trigger(target, key, TriggerType.ADD)
    }
    return res
  },
  delete(key) {
    const target = this[RAW]
    const hadKey = target.has(key)
    const res = target.delete(key)
    if (hadKey) {
      trigger(target, key, TriggerType.DELETE)
    }
    return res
  },
  get(key) {
    const target = this[RAW]
    const had = target.has(key)
    track(target, key)
    if (had) {
      const res = target.get(key)
      return typeof res === 'object' ? reactive(res) : res
    }
  },
  set(key, value) {
    const target = this[RAW]
    const had = target.has(key)
    const oldValue = target.get(key)
    const rawValue = value[RAW] || value
    target.set(key, rawValue)
    if (!had) {
      trigger(target, key, TriggerType.ADD)
    } else if (
      oldValue !== value ||
      (oldValue === oldValue && value === value)
    ) {
      trigger(target, key, TriggerType.SET)
    }
  },
  forEach(callback, thisArg) {
    const reactiveWrapper = (val) =>
      typeof val === 'object' ? reactive(val) : val
    const target = this[RAW]
    track(target, ITERATE_KEY)
    target.forEach((v, k) => {
      callback.call(thisArg, reactiveWrapper(v), reactiveWrapper(k), this)
    })
  },
  entries: iterationMethod(IterationMethodType.PAIR),
  [Symbol.iterator]: iterationMethod(IterationMethodType.PAIR),
  values: iterationMethod(IterationMethodType.VALUE),
  keys: iterationMethod(IterationMethodType.KEY),
}

// Map & Set 类型的迭代器函数
function iterationMethod(type) {
  return function () {
    const target = this[RAW]
    const itr =
      type === IterationMethodType.PAIR
        ? target[Symbol.iterator]()
        : type === IterationMethodType.KEY
        ? target.keys()
        : target.values()
    const reactiveWrapper = (val) =>
      typeof val === 'object' && val !== null ? reactive(val) : val
    type === IterationMethodType.KEY
      ? track(target, MAP_KEY_ITERATE_KEY)
      : track(target, ITERATE_KEY)
    return {
      next() {
        const { value, done } = itr.next()
        return {
          value:
            type === IterationMethodType.PAIR
              ? value
                ? [reactiveWrapper(value[0]), reactiveWrapper(value[1])]
                : value
              : reactiveWrapper(value),
          done,
        }
      },
      [Symbol.iterator]() {
        return this
      },
    }
  }
}

// 判断某个对象是否是 Map 类型
const isMap = (target) =>
  Object.prototype.toString.call(target) === '[object Map]'

// 判断某个对象是否是 Set 类型
const isSet = (target) =>
  Object.prototype.toString.call(target) === '[object Set]'

// 创建响应式数据
export function createReactive(data, isShallow = false, isReadonly = false) {
  return new Proxy(data, {
    get(target, key, receiver) {
      if (key === RAW) {
        return target
      }

      if (isMap(target) || isSet(target)) {
        if (key === 'size') {
          track(target, ITERATE_KEY)
          return Reflect.get(target, key, target)
        }

        return mutableInstrumentations[key]
      }

      if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }

      if (!isReadonly && typeof key !== 'symbol') {
        track(target, key)
      }

      const res = Reflect.get(target, key, receiver)
      if (isShallow) {
        return res
      }
      if (typeof res === 'object' && res !== null) {
        return isReadonly ? readonly(res) : reactive(data)
      }
      return res
    },
    set(target, key, newValue, receiver) {
      if (isReadonly) {
        console.warn(`属性 ${key} 是只读的！`)
        return true
      }

      const oldValue = target[key]

      const type = Array.isArray(target)
        ? Number(key) < target.length
          ? TriggerType.SET
          : TriggerType.ADD
        : Object.prototype.hasOwnProperty.call(target, key)
        ? TriggerType.SET
        : TriggerType.ADD

      const res = Reflect.set(target, key, newValue, receiver)

      if (target === receiver[RAW]) {
        if (
          oldValue !== newValue &&
          (oldValue === oldValue || newValue === newValue)
        ) {
          trigger(target, key, type, newValue)
        }
      }

      return res
    },
    has(target, key) {
      track(target, key)
      return Reflect.has(target, key)
    },
    ownKeys(target) {
      track(target, Array.isArray(target) ? 'length' : ITERATE_KEY)
      return Reflect.ownKeys(target)
    },
    deleteProperty(target, key) {
      if (isReadonly) {
        console.warn(`属性 ${key} 是只读的！`)
        return true
      }

      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const res = Reflect.deleteProperty(target, key)

      if (res && hadKey) {
        trigger(target, key, TriggerType.DELETE)
      }

      return res
    },
  })
}
