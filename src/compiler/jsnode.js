// JavaScript AST 节点
const FunctionDeclNode = {
  type: 'FunctionDecl', // 表示该节点为函数声明节点
  id: {
    type: 'Identifier',
    name: 'render',
  },
  params: [],
  body: [
    {
      type: 'ReturnStatement',
      return: null,
    },
  ],
}

// 函数调用语句 AST 节点
const CallExp = {
  type: 'CallExpression',
  // 描述被调用函数的名称
  callee: {
    type: 'Identifier',
    name: 'h',
  },
  // 被调用函数的形参
  arguments: [],
}

// 字符串字面量 AST 节点
const Str = {
  type: 'StringLiteral',
  value: 'div',
}

// 数组 AST 节点
const Arr = {
  type: 'ArrayExpression',
  elements: [],
}
