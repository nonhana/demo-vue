import { tokenize } from './tokenizer.js'

export function parse(str) {
  // 首先对模板进行标记化
  const tokens = tokenize(str)

  // 根节点，基于它之上进行构建
  const root = {
    type: 'Root',
    children: [],
  }

  // elementStack 栈用来维护标签之间的父子关系
  const elementStack = [root]

  // 扫描全部的 tokens
  while (tokens.length) {
    const parent = elementStack[elementStack.length - 1]
    const t = tokens[0]
    switch (t.type) {
      case 'tag':
        const elementNode = {
          type: 'Element',
          tag: t.type,
          children: [],
        }
        parent.children.push(elementNode)
        elementStack.push(elementNode)
        break
      case 'text':
        const textNode = {
          type: 'Text',
          content: t.content,
        }
        parent.children.push(textNode)
        break
      case 'tagEnd':
        elementStack.pop()
        break
    }
    tokens.shift()
  }

  return root
}
