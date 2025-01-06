import { reactive } from './reactive.js'

// 将原始值包装为响应式对象
export function ref(val) {
  const wrapper = {
    value: val,
  }
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true,
  })
  return reactive(wrapper)
}

// 处理响应丢失问题
export function toRef(obj, key) {
  const wrapper = {
    get value() {
      return obj[key]
    },
    set value(val) {
      obj[key] = val
    },
  }
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true,
  })
  return wrapper
}

// 批量处理响应丢失问题
export function toRefs(obj) {
  const ret = {}
  for (const key in obj) {
    ret[key] = toRef(obj, key)
  }
  return ret
}

// 自动脱 ref
export function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver)
      return value.__v_isRef ? value.value : value
    },
    set(target, key, newValue, receiver) {
      const value = target[key]
      if (value.__v_isRef) {
        value.value = newValue
        return true
      }
      return Reflect.set(target, key, newValue, receiver)
    },
  })
}
