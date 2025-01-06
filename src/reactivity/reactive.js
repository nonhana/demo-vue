import { createReactive } from './core.js'

// 存储原始对象到代理对象的映射
const reactiveMap = new Map()

// 深响应
export function reactive(data) {
  const existProxy = reactiveMap.get(data)
  if (existProxy) return existProxy

  const proxy = createReactive(data)
  reactiveMap.set(data, proxy)
  return proxy
}

// 浅响应
export function shallowReactive(data) {
  return createReactive(data, true)
}
