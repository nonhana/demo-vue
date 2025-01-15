export function createTeleport() {
  return {
    __isTeleport: true,
    process(n1, n2, container, anchor, internals) {
      // 处理渲染逻辑
      const { patch, patchChildren, move } = internals
      if (!n1) {
        const target =
          typeof n2.props.to === 'string'
            ? document.querySelector(n2.props.to)
            : n2.props.to
        n2.children.forEach((c) => patch(null, c, target, anchor))
      } else {
        patchChildren(n1, n2, container)
        // 如果新旧 to 参数值不同，则需要对内容进行移动
        if (n2.props.to !== n1.props.to) {
          const newTarget =
            typeof n2.props.to === 'string'
              ? document.querySelector(n2.props.to)
              : n2.props.to
          n2.children.forEach((c) => move(c, newTarget))
        }
      }
    },
  }
}
