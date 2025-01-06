import { effect, trigger, track } from './core.js'

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
