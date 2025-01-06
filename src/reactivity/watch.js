import { effect } from './core.js'
import { traverse } from './utils.js'

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
