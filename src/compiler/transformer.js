import { dump } from './utils.js'

// 以深度优先的方式遍历 ast 的每个节点
export function traverseNode(ast, context) {
  context.currentNode = ast
  const transforms = context.nodeTransforms
  for (let i = 0; i < transforms.length; i++) {
    transforms[i](context.currentNode, context)
    // 任何的转换函数都有可能移除当前节点，因此每个转换函数执行完毕后都要进行判空
    if (!context.currentNode) return
  }
  const children = context.currentNode.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      context.parent = context.currentNode
      context.childIndex = i
      traverseNode(children[i], context)
    }
  }
}

// 在这里可以自定义如何对标签节点进行转换
function transformElement() {}

// 在这里可以自定义如何对文本节点进行转换
function transformText(node, context) {
  if (node.type === 'Text') {
    context.removeNode()
  }
}

export function transform(ast) {
  const context = {
    // 当前正在转换的节点
    currentNode: null,
    // 当前节点在父节点的 children 中的位置索引
    childIndex: 0,
    // 当前转换节点的父节点
    parent: null,
    replaceNode(node) {
      context.parent.children[context.childIndex] = node
      context.currentNode = node
    },
    removeNode() {
      if (context.parent) {
        context.parent.children.splice(context.childIndex, 1)
        context.currentNode = null
      }
    },
    // 将转换函数注册到 context.nodeTransform 数组中
    nodeTransforms: [transformElement, transformText],
  }
  traverseNode(ast, context)
  console.log(dump(ast))
}
