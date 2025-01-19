// 以深度优先的方式遍历 ast 的每个节点
export function traverseNode(ast, context) {
  context.currentNode = ast
  // 退出阶段的回调函数数组
  const exitFns = []
  const transforms = context.nodeTransforms
  for (let i = 0; i < transforms.length; i++) {
    // 把转换函数返回的函数作为退出阶段的回调函数
    const onExit = transforms[i](context.currentNode, context)
    if (onExit) {
      exitFns.push(onExit)
    }
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

  // 倒序执行 exitFns 里面缓存好的函数
  // 放在最后能够确保执行的时候当前访问的子节点已经全部处理过了
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}

// 在这里可以自定义如何对标签节点进行转换
function transformElement(node) {
  return () => {
    if (node.type !== 'Element') {
      return
    }

    // 1. 创建 h 函数
    const callExp = createCallExpression('h', [createStringLiteral(node.tag)])
    // 2. 处理 h 函数调用的参数
    node.children.length === 1
      ? callExp.arguments.push(node.children[0].jsNode)
      : callExp.arguments.push(
          createArrayExpression(node.children.map((c) => c.jsNode))
        )
    // 3. 将当前标签节点对应的 JS AST 添加到 jsNode 属性下
    node.jsNode = callExp
  }
}

// 在这里可以自定义如何对文本节点进行转换
function transformText(node) {
  if (node.type !== 'Text') {
    return
  }

  // 文本节点对应的 JS AST 节点是一个 String Literal
  node.jsNode = createStringLiteral(node.content)
}

function transformRoot(node) {
  return () => {
    if (node.type !== 'Root') {
      return
    }

    const vnodeJsAST = node.children[0].jsNode
    node.jsNode = {
      type: 'FunctionDecl',
      id: { type: 'Identifier', name: 'render' },
      params: [],
      body: [
        {
          type: 'ReturnStatement',
          return: vnodeJsAST,
        },
      ],
    }
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
    // 这就类似于一个简单的插件架构
    // 提供一个全局的上下文并挂载必要的信息，然后以参数的形式传入引用，由自定义的工具函数进行消费
    nodeTransforms: [transformRoot, transformElement, transformText],
  }
  traverseNode(ast, context)
}

// ---------- 模板 AST -> JS AST ---------- //

// 创建 StringLiteral 节点
function createStringLiteral(value) {
  return {
    type: 'StringLiteral',
    value,
  }
}

// 创建 Identifier 节点
function createIdentifier(name) {
  return {
    type: 'Identifier',
    name,
  }
}

// 创建 ArrayExpression 节点
function createArrayExpression(elements) {
  return {
    type: 'ArrayExpression',
    elements,
  }
}

// 创建 CallExpression 节点
function createCallExpression(callee, params) {
  return {
    type: 'CallExpression',
    callee: createIdentifier(callee),
    arguments: params,
  }
}
