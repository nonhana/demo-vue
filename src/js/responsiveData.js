const bucket = new WeakMap()

// 对原始数据使用 Proxy 进行代理
export function ref(data) {
  return new Proxy(data, {
    get(target, key) {
      track(target, key)
      return target[key]
    },
    set(target, key, newVal) {
      target[key] = newVal
      trigger(target, key)
      return true
    },
  })
}

// 追踪依赖
function track(target, key) {
  if (!activeEffectFn) return
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
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)

  const effectsToRun = new Set()
  effects &&
    effects.forEach((effectFn) => {
      if (effectFn !== activeEffectFn) {
        effectsToRun.add(effectFn)
      }
    })
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
function effect(effectFn, options = {}) {
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

function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i] // deps 是 Set<() => void>[] 类型
    deps.delete(effectFn) // 从每个 Set 里面把这个副作用函数删掉
  }
  effectFn.deps.length = 0
}

/** 计算属性 computed */
export function computed(getter) {
  let value // 用来缓存上一次的值
  let dirty = true // 标记是否需要重新计算值，true 表示需要重新算

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      if (!dirty) {
        dirty = true // 标记 dirty，让下一次访问重新计算
        trigger(obj, 'value') // 通知依赖
      }
    },
  })

  const obj = {
    get value() {
      if (dirty) {
        value = effectFn() // 调用 effectFn，重新计算值
        dirty = false // 计算完成后重置 dirty 状态
      }
      track(obj, 'value') // 注册依赖
      return value
    },
  }

  return obj
}

/** watch 监听响应式数据 */
export function watch(source, callback, options = {}) {
  let getter // () => void
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }

  let oldValue, newValue
  let cleanup // 保存过期回调函数

  function onInvalidate(fn) {
    cleanup = fn
  }

  const job = () => {
    newValue = effectFn()
    // 注意在回调函数执行之前调用过期回调
    if (cleanup) {
      cleanup()
    }
    callback(newValue, oldValue, onInvalidate)
    oldValue = newValue
  }

  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler() {
      if (options.flush === 'post') {
        const p = Promise.resolve()
        p.then(job) // 把 job 放到微任务队列里以实现延迟执行
      } else {
        job()
      }
    },
  })

  if (options.immediate) {
    job()
  } else {
    oldValue = effectFn()
  }
}

// 递归地读取数据，触发 Proxy 的 get 进行依赖收集
function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return
  seen.add(value)
  for (const k in value) {
    traverse(value[k], seen)
  }
  return value
}
