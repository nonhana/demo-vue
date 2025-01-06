import { createReactive } from './core.js'

// 深只读
export function readonly(data) {
  return createReactive(data, false, true)
}

// 浅只读
export function shallowReadonly(data) {
  return createReactive(data, true, true)
}
