import { Text, Comment, Fragment } from './constants.js'
import { lis } from './utils.js'

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

  // 简单 Diff 算法
  function simpleDiff(n1, n2, container) {
    const oldChildren = n1.children
    const newChildren = n2.children

    // 存储在寻找过程中的最大索引值，用来判断新旧节点的相对位置，是否需要移动节点
    let lastIndex = 0

    for (let i = 0; i < newChildren.length; i++) {
      const newVNode = newChildren[i]
      // 设置一个标志位，标识是否在旧的子节点里面找到可以复用的节点
      let find = false
      for (let j = 0; j < oldChildren.length; j++) {
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
              // 因为 insert 的具体实现是 insertBefore，所以要使用 nextSibling 作为锚点插入
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
  }

  // 双端 Diff 算法
  function twoEndDiff(n1, n2, container) {
    const oldChildren = n1.children
    const newChildren = n2.children

    // 双端 Diff 算法的核心 - 四个 index
    let oldStartIdx = 0
    let oldEndIdx = oldChildren.length - 1
    let newStartIdx = 0
    let newEndIdx = newChildren.length - 1

    // 四个索引指向的 vnode 节点
    let oldStartVNode = oldChildren[oldStartIdx]
    let oldEndVNode = oldChildren[oldEndIdx]
    let newStartVNode = newChildren[newStartIdx]
    let newEndVNode = newChildren[newEndIdx]

    // 循环进行双端比较
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (!oldStartVNode) {
        oldStartVNode = oldChildren[++oldStartIdx]
      } else if (!oldEndVNode) {
        oldEndVNode = oldChildren[--oldEndIdx]
      } else if (oldStartVNode.key === newStartVNode.key) {
        patch(oldStartVNode, newStartVNode, container)
        oldStartVNode = oldChildren[++oldStartIdx]
        newStartVNode = newChildren[++newStartIdx]
      } else if (oldEndVNode.key === newEndVNode.key) {
        // 走到这里，说明位置不变都在尾部，打补丁就好
        patch(oldEndVNode, newEndVNode, container)
        // 更新索引与节点值
        oldEndVNode = oldChildren[--oldEndIdx]
        newEndVNode = newChildren[--newEndIdx]
      } else if (oldStartVNode.key === newEndVNode.key) {
        // 走到这里，说明之前老节点的第一个被移到了最后面
        patch(oldStartVNode, newEndVNode, container)
        // 获取尾部节点的下一个兄弟节点作为锚点
        insert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)
        oldStartVNode = oldChildren[++oldStartIdx]
        newEndVNode = newChildren[--newEndIdx]
      } else if (oldEndVNode.key === newStartVNode.key) {
        // 走到这里，说明之前老节点的最后一个被移到了最前面
        // 打补丁补内容
        patch(oldEndVNode, newStartVNode, container)
        // 移动 DOM
        insert(oldEndVNode.el, container, oldStartVNode.el)
        // 更新索引与节点值
        oldEndVNode = oldChildren[--oldEndIdx]
        newStartVNode = newChildren[++newStartIdx]
      } else {
        // 走到这里，说明不会命中四个步骤中的任何一个
        // 特殊处理：拿着新子节点的首节点去旧子节点中找有没有可以复用的
        const idxInOld = oldChildren.findIndex(
          (node) => node.key === newStartVNode.key
        )
        if (idxInOld > 0) {
          // 找到了
          const vnodeToMove = oldChildren[idxInOld]
          patch(vnodeToMove, newStartVNode, container)
          insert(vnodeToMove.el, container, oldStartVNode.el)
          oldChildren[idxInOld] = undefined
        } else {
          // 没找到
          // 说明是新节点得挂载
          patch(null, newStartVNode, container, oldStartVNode.el)
        }
        newStartVNode = newChildren[++newStartIdx]
      }
    }

    // 循环结束之后检查索引值，是否有遗漏的情况
    if (oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx) {
      // 如果满足，说明新的子节点组中有遗留的节点需要挂载
      for (let i = newStartIdx; i <= newEndIdx; i++) {
        patch(null, newChildren[i], container, oldStartVNode.el)
      }
    } else if (newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx) {
      // 如果满足，说明老的子节点组中有多余的节点需要删除
      for (let i = oldStartIdx; i <= oldEndIdx; i++) {
        unmount(oldChildren[i])
      }
    }
  }

  // 快速 Diff 算法
  function quickDiff(n1, n2, container) {
    const newChildren = n2.children
    const oldChildren = n1.children

    // 1. 对前置节点进行更新
    let j = 0
    let oldVNode = oldChildren[j]
    let newVNode = newChildren[j]

    while (oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container)
      j++
      oldVNode = oldChildren[j]
      newVNode = newChildren[j]
    }

    // 2. 对后置节点进行更新
    let oldEnd = oldChildren.length - 1
    let newEnd = newChildren.length - 1

    oldVNode = oldChildren[oldEnd]
    newVNode = newChildren[newEnd]

    while (oldVNode.key === newVNode.key) {
      patch(oldVNode, newVNode, container)
      oldVNode = oldChildren[--oldEnd]
      newVNode = newChildren[--newEnd]
    }

    // 处理新增节点
    if (j > oldEnd && j <= newEnd) {
      const anchorIndex = newEnd + 1
      const anchor =
        anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null
      while (j <= newEnd) {
        patch(null, newChildren[j++], container, anchor)
      }
    }
    // 处理遗留节点
    else if (j > newEnd && j <= oldEnd) {
      while (j <= oldEnd) {
        unmount(oldChildren[j++])
      }
    }
    // 处理剩余情况
    else {
      // 构造 source 数组
      // 第 i 个位置上的值 n 表示新子节点的第 i 个位置的节点在旧子节点的第 n 个位置
      // 如 source = [2, 3, 1, -1]，source[0] = 2，表示新子节点的第 0 个位置的节点原来在旧子节点的第 2 个索引
      const count = newEnd - j + 1
      const source = Array(count).fill(-1)

      const oldStart = j
      const newStart = j

      let moved = false
      let pos = 0

      // 新子节点的 key <-> index 的映射
      const keyIndex = {}
      for (let i = newStart; i <= newEnd; i++) {
        keyIndex[newChildren[i].key] = i
      }

      let patched = 0 // 代表已更新过的节点数量

      for (let i = oldStart; i <= oldEnd; i++) {
        if (patched <= count) {
          oldVNode = oldChildren[i]
          const k = keyIndex[oldVNode.key]

          if (typeof k !== 'undefined') {
            newVNode = newChildren[k]
            patch(oldVNode, newVNode, container)
            patched++
            source[k - newStart] = i
            if (k < pos) {
              moved = true
            } else {
              pos = k
            }
          } else {
            unmount(oldVNode)
          }
        } else {
          unmount(oldVNode)
        }
      }

      if (moved) {
        // 计算 source 的最长递增子序列（LIS）
        // LIS 的意义是：在新的一组子节点中，重新编号后的哪些索引值的节点在更新前后顺序没有发生变化
        // 也就是说，LIS 算出来的结果说明了哪些索引的节点是不需要移动的
        const seq = lis(source)

        // 指向 LIS 的最后一个元素
        let s = seq.length - 1
        // 指向新子节点的最后一个元素
        let i = count - 1
        for (; i >= 0; i--) {
          if (source[i] === -1) {
            // 说明索引为 i 的节点为全新的节点需要被挂载
            const pos = i + newStart
            const newVNode = newChildren[pos]
            const nextPos = pos + 1
            const anchor =
              nextPos < newChildren.length ? newChildren[pos].el : null
            patch(null, newVNode, container, anchor)
          } else if (i !== seq[s]) {
            // seq 里面的值都是不需要被移动的值，也就是说不等于就需要被移动
            const pos = i + newStart
            const newVNode = newChildren[pos]
            const nextPos = pos + 1
            const anchor =
              nextPos < newChildren.length ? newChildren[nextPos].el : null
            insert(newVNode.el, container, anchor)
          } else {
            s--
          }
        }
      }
    }
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
        quickDiff(n1, n2, container)
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

  // 打补丁更新节点的内容
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
