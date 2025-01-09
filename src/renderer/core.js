import { Text, Comment, Fragment } from './constants.js'

// 判断是否是只读属性
export function shouldSetAsProps(el, key, value) {
  // 只读属性设置到 HTML Attributes 上
  if (key === 'form' && el.tagName === 'INPUT') return false
  return key in el
}

// 卸载某个 vnode
// 先拿到要卸载的目标节点的父节点，调用 removeChild 方法
// ↑ 最标准，符合 W3C 规范
export function unmount(vnode) {
  // 对于 Fragment 节点，它本身不代表任何内容，要卸载它的 children
  if (vnode.type === Fragment) {
    vnode.children.forEach((c) => unmount(c))
    return
  }
  const parent = vnode.parentNode
  if (parent) parent.removeChild(el)
}

export function createRenderer(options) {
  // 与浏览器 API 解耦，从而能够实现跨平台
  // 在别的平台比如 node 端，传另外一套配置即可
  const {
    createElement,
    insert,
    setElementText,
    patchProps,
    createText,
    setText,
    createComment,
    setComment,
  } = options

  // 挂载 vnode
  function mountElement(vnode, container, anchor) {
    const el = (vnode.el = createElement(vnode.type))
    // 处理子节点为一般文本的情况
    if (typeof vnode.children === 'string') {
      setElementText(el, vnode.children)
    }
    // 处理子节点为数组的情况
    else if (Array.isArray(vnode.children)) {
      vnode.children.forEach((child) => {
        patch(null, child, el)
      })
    }
    // 处理 vnode.props
    if (vnode.props) {
      for (const key in vnode.props) {
        // 调用 patchProps 为元素设置属性
        patchProps(el, key, null, vnode.props[key])
      }
    }
    insert(el, container, anchor)
  }

  // 更新 vnode
  function patchElement(n1, n2) {
    const el = (n2.el = n1.el)
    const oldProps = n1.props
    const newProps = n2.props

    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(el, key, oldProps[key], newProps[key])
      }
    }
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el, key, oldProps[key], null)
      }
    }

    patchChildren(n1, n2, el)
  }

  // 更新子节点
  function patchChildren(n1, n2, container) {
    if (typeof n2.children === 'string') {
      // 只有当旧子节点为一组子节点时才需要逐个卸载
      // 其他情况什么都不用做，在 patch 函数里面已经帮我们做完了
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c) => unmount(c))
      }
      setElementText(container, n2.children)
    } else if (Array.isArray(n2.children)) {
      if (Array.isArray(n1.children)) {
        // 到这里就说明，新、旧子节点都是一组子节点
        // 这里涉及到核心的 Diff 算法
        // ↓ 以下是 简单 Diff 算法的实现 ↓
        const oldChildren = n1.children
        const newChildren = n2.children

        // 存储在寻找过程中的最大索引值，用来判断新旧节点的相对位置，是否需要移动节点
        let lastIndex = 0

        for (let i = 0; i < newChildren.length; i++) {
          const newVNode = newChildren[i]
          let j = 0
          // 设置一个标志位，标识是否在旧的子节点里面找到可以复用的节点
          let find = false
          for (; j < oldChildren.length; j++) {
            const oldVNode = oldChildren[j]
            if (newVNode.key === oldVNode.key) {
              // 代码运行到这里，说明已经在旧子节点中找到可以复用的了
              find = true
              patch(oldVNode, newVNode, container)
              if (j < lastIndex) {
                // 代码运行到这里，说明 newVNode 对应的真实 DOM 需要移动了
                // 要移动到前一个 VNode 的后面，所以先拿到前一个
                const prevVNode = newChildren[i - 1]
                if (prevVNode) {
                  const anchor = prevVNode.el.nextSibling
                  insert(newVNode.el, container, anchor)
                }
              } else {
                lastIndex = j
              }
              break
            }
          }
          // 代码运行到这里，如果 find 为 false 说明当前的 newVNode 没有在旧的一组子节点中找到可以复用的节点
          // 也就是说是新节点，需要挂载！
          if (!find) {
            // 为了将节点挂载到一个正确的位置，需要找准锚点
            let anchor = null
            const prevVNode = newChildren[i - 1]
            if (prevVNode) {
              anchor = prevVNode.el.nextSibling
            } else {
              anchor = container.firstChild
            }
            patch(null, newVNode, container, anchor)
          }
        }

        // 代码运行到这里，说明已经将新子节点组遍历完了
        // 遍历旧子节点，拿着 key 去新子节点组找有没有一样的，没有就说明要删除
        for (let i = 0; i < oldChildren.length; i++) {
          const oldVNode = oldChildren[i]
          const has = newChildren.find((vnode) => vnode.key === oldVNode.key)
          if (!has) {
            unmount(oldVNode)
          }
        }

        // const oldLen = oldChildren.length
        // const newLen = newChildren.length
        // const commonLength = Math.min(oldLen, newLen)

        // for (let i = 0; i < commonLength; i++) {
        //   patch(oldChildren[i], newChildren[i])
        // }
        // // 新节点数量比旧节点多，需要挂载新的
        // if (newLen > oldLen) {
        //   for (let i = commonLength; i < newLen; i++) {
        //     patch(null, newChildren[i], container)
        //   }
        // }
        // // 旧节点数量比心节点多，需要卸载旧的
        // else if (oldLen > newLen) {
        //   for (let i = commonLength; i < oldLen; i++) {
        //     unmount(oldChildren[i])
        //   }
        // }
      } else {
        setElementText(container, '')
        n2.children.forEach((c) => patch(null, c, container))
      }
    } else {
      if (Array.isArray(n1.children)) {
        n1.children.forEach((c) => unmount(c))
      } else if (typeof n1.children === 'string') {
        setElementText(container, '')
      }
      // 如果旧子节点也为 null，那么什么都不需要做
    }
  }

  function patch(n1, n2, container, anchor) {
    // 如果 n1 存在，则对比 n1 与 n2 的 tag 类型
    if (n1 && n1.type !== n2.type) {
      // 如果新旧 vnode 的类型不一样，将旧 vnode 卸载，将新 vnode 挂载即可
      unmount(n1)
      n1 = null // 确保下面正常触发挂载流程
    }
    const { type } = n2 // 到这里，说明 n1 和 n2 的类型是一样的
    // 1. 普通标签元素
    if (typeof type === 'string') {
      if (!n1) {
        // 单纯挂载
        mountElement(n2, container, anchor)
      } else {
        // 更新
        patchElement(n1, n2)
      }
    }
    // 2. 如果 type 为 object，则就是我们自己写的 vue 组件
    else if (typeof type === 'object') {
    }
    // 3. 文本节点
    else if (type === Text) {
      // 如果没有旧节点，则进行挂载
      if (!n1) {
        const el = (n2.el = createText(n2.children))
        insert(el, container)
      }
      // 如果有旧节点，则将内容进行替换
      else {
        const el = (n2.el = n1.el)
        if (n2.children !== n1.children) {
          setText(el, n2.children)
        }
      }
    }
    // 4. 注释节点
    else if (type === Comment) {
      if (!n1) {
        const el = (n2.el = createComment(n2.children))
        insert(el, container)
      } else {
        const el = (n2.el = n1.el)
        if (n2.children !== n1.children) {
          setComment(el, n2.children)
        }
      }
    }
    // 5. Fragment 节点
    else if (type === Fragment) {
      if (!n1) {
        n2.children.forEach((c) => patch(null, c, container))
      } else {
        patchChildren(n1, n2, container)
      }
    }
  }

  function render(vnode, container) {
    if (vnode) {
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        unmount(container._vnode)
      }
    }
    container._vnode = vnode
  }

  return {
    render,
  }
}
