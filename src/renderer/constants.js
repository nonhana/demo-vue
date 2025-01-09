// 人为造的一些 vnode 标识
// vnode 的类型：
// 1. 普通 html 节点 - 标准字符串
// 2. 自己写的 vue 组件 - 对象
// 3. 文本节点 - 自定义 Symbol
// 4. 注释节点 - 自定义 Symbol
// 5. 碎片节点 - 自定义 Symbol

export const Text = Symbol()

export const Comment = Symbol()

export const Fragment = Symbol()
