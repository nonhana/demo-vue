// 递归地读取数据，触发 Proxy 的 get 进行依赖收集
export function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return
  seen.add(value)
  for (const k in value) {
    traverse(value[k], seen)
  }
  return value
}

// 清理副作用函数集
export function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i] // deps 是 Set<() => void>[] 类型
    deps.delete(effectFn) // 从每个 Set 里面把这个副作用函数删掉
  }
  effectFn.deps.length = 0
}
