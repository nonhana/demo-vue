export function createKeepAlive(instance) {
  const currentInstance = instance
  const KeepAlive = {
    // KeepAlive 组件独有的标识
    __isKeepAlive: true,
    props: {
      include: RegExp,
      exclude: RegExp,
    },
    setup(props, { slots }) {
      // 创建一个缓存对象
      // key: vnode.type
      // value: vnode
      const cache = new Map()
      const instance = currentInstance

      // 渲染器会给 KeepAlive 实例上注入特殊的 keepAliveCtx 对象
      const { move, createElement } = instance.keepAliveCtx

      // 创建隐藏容器
      const storageContainer = createElement('div')

      // 给 KeepAlive 组件的实例上添加两个内部函数： _deActivate 和 _activate
      // 会在渲染器中被调用
      instance._deActivate = (vnode) => {
        move(vnode, storageContainer)
      }
      instance._activate = (vnode, container, anchor) => {
        move(vnode, container, anchor)
      }

      return () => {
        let rawVNode = slots.default()
        // 非组件的虚拟节点无法被 KeepAlive
        if (typeof rawVNode.type !== 'object') {
          return rawVNode
        }
        // 获取内部组件的 name
        const name = rawVNode.type.name
        // 对 name 进行正则匹配
        if (
          name &&
          ((props.include && !props.include.test(name)) ||
            (props.exclude && props.exclude.test(name)))
        ) {
          return rawVNode
        }

        // 挂载时先获取缓存的组件 vnode
        const cachedVNode = cache.get(rawVNode.type)
        if (cachedVNode) {
          // 如果有，那么执行激活操作
          rawVNode.component = cachedVNode.component
          rawVNode.keptAlive = true
        } else {
          cache.set(rawVNode.type, rawVNode)
        }

        rawVNode.shouldKeepAlive = true
        rawVNode.keepAliveInstance = instance
        return rawVNode
      }
    },
  }

  return KeepAlive
}
