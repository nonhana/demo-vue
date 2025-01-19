export function generate(node) {
  const context = {
    code: '',
    push(code) {
      context.code += code
    },
    // 缩进级别
    currentIndent: 0,
    // 换行并保持缩进
    newline() {
      context.code += '\n' + `  `.repeat(context.currentIndent)
    },
    // 缩进
    indent() {
      context.currentIndent++
      context.newline()
    },
    // 取消缩进
    deIndent() {
      context.currentIndent--
      context.newline()
    },
  }

  genNode(node, context)

  return context.code
}

// 生成函数参数代码
function genNodeList(nodes, context) {
  const { push } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    genNode(node, context)
    if (i < nodes.length - 1) {
      push(', ')
    }
  }
}

// 生成函数声明语句
function genFunctionDecl(node, context) {
  // 从 context 中取出工具函数
  const { push, indent, deIndent } = context
  push(`function ${node.id.name}`)
  push(`(`)
  genNodeList(node.params, context)
  push(`)`)
  push(`{`)
  indent()
  node.body.forEach((n) => genNode(n, context))
  deIndent()
  push(`}`)
}

// 生成数组代码
function genArrayExpression(node, context) {
  const { push } = context
  push('[')
  genNodeList(node.elements, context)
  push(']')
}

// 生成返回值代码
function genReturnStatement(node, context) {
  const { push } = context
  push(`return `)
  genNode(node.return, context)
}

// 生成字符串字面量代码
function genStringLiteral(node, context) {
  const { push } = context
  push(`'${node.value}'`)
}

// 生成调用函数代码
function genCallExpression(node, context) {
  const { push } = context
  const { callee, arguments: args } = node
  push(`${callee.name}(`)
  genNodeList(args, context)
  push(`)`)
}

function genNode(node, context) {
  switch (node.type) {
    case 'FunctionDecl':
      genFunctionDecl(node, context)
      break
    case 'ReturnStatement':
      genReturnStatement(node, context)
      break
    case 'ArrayExpression':
      genArrayExpression(node, context)
      break
    case 'StringLiteral':
      genStringLiteral(node, context)
      break
    case 'CallExpression':
      genCallExpression(node, context)
      break
  }
}
