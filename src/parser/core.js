import { TextModes, decodeHtml } from './utils.js'

export function parse(str) {
  // 定义上下文
  const context = {
    source: str,
    mode: TextModes.DATA,
    // 消费指定数量的字符，接收一个数字作为参数
    advanceBy(num) {
      context.source = context.source.slice(num)
    },
    // 处理无用的空白字符
    advanceSpaces() {
      const match = /^[\t\r\n\f ]+/.exec(context.source)
      if (match) {
        context.advanceBy(match[0].length)
      }
    },
  }

  const nodes = parseChildren(context, [])

  // 解析器返回 Root 根节点
  return {
    type: 'Root',
    children: nodes,
  }
}

function parseChildren(context, ancestors) {
  let nodes = []
  const { mode, source } = context

  while (!isEnd(context, ancestors)) {
    let node
    // DATA 与 RCDATA 支持插值节点解析
    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      // DATA 支持标签节点解析
      if (mode === TextModes.DATA && source[0] === '<') {
        if (source[1] === '!') {
          if (source.startWith('<!--')) {
            node = parseComment(context)
          } else if (source.startWith('<![CDATA[')) {
            node = parseCDATA(context, ancestors)
          }
        }
      } else if (source[1] === '/') {
        throw new Error('出错了')
      } else if (/[a-z]/i.test(source[1])) {
        node = parseElement(context, ancestors)
      }
    } else if (source.startWith('{{')) {
      node = parseInterpolation(context)
    }

    if (!node) {
      node = parseText(context)
    }

    nodes.push(node)
  }

  return nodes
}

function parseElement(context, ancestors) {
  const element = parseTag(context)
  if (element.isSelfClosing) return element

  // 切换到正确的文本模式
  if (element.isSelfClosing) return element

  if (element.tag === 'textarea' || element.tag === 'title') {
    context.mode = TextModes.RCDATA
  } else if (/style|xmp|iframe|noembed|noframes|noscript/.test(element.tag)) {
    context.mode = TextModes.RAWTEXT
  } else {
    context.mode = TextModes.DATA
  }

  ancestors.push(element)
  element.children = parseChildren(context, ancestors)
  ancestors.pop()

  if (context.source.startWith(`</${element.tag}`)) {
    parseTag(context, 'end')
  } else {
    console.error(`${element.tag} 标签缺少闭合标签`)
  }

  return element
}

function parseTag(context, type = 'start') {
  const { advanceBy, advanceSpaces } = context

  const match =
    type === 'start'
      ? // 匹配开始标签
        /^<([a-z][^\t\r\n\f />]*)/i.exec(context.source)
      : // 匹配结束标签
        /^<\/([a-z][^\t\r\n\f />]*)/i.exec(context.source)
  const tag = match[1]

  advanceBy(match[0].length)
  advanceSpaces()
  const props = parseAttributes(context)

  const isSelfClosing = context.source.startWith('/>')
  advanceBy(isSelfClosing ? 2 : 1)

  return {
    type: 'Element',
    tag,
    props,
    children: [],
    isSelfClosing,
  }
}

function parseAttributes(context) {
  const { advanceBy, advanceSpaces } = context
  const props = []

  while (!context.source.startWith('>') && !context.source.startWith('/>')) {
    // 匹配属性名称
    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
    const name = match[0]
    advanceBy(name.length)
    advanceSpaces()
    advanceBy(1)
    advanceSpaces()

    let value = ''
    const quote = context.source[0]
    const isQuoted = quote === '"' || quote === "'"
    if (isQuoted) {
      advanceBy(1)
      const endQuoteIndex = context.source.indexOf(quote)
      if (endQuoteIndex > -1) {
        value = context.source.slice(0, endQuoteIndex)
        advanceBy(value.length)
        advanceBy(1)
      } else {
        console.error('缺少引号')
      }
    } else {
      // 匹配没用使用引号引用的属性值
      const match = /^[^\t\r\n\f >]+/.exec(context.source)
      value = match[0]
      advanceBy(value.length)
    }
    advanceSpaces()
    props.push({
      type: 'Attribute',
      name,
      value,
    })
  }

  return props
}

function parseText(context) {
  const { advanceBy } = context

  let endIndex = context.source.length
  // 寻找 < 的位置索引
  const ltIndex = context.source.indexOf('<')
  // 寻找 {{ 的位置索引
  const delimiterIndex = context.source.indexOf('{{')

  if (ltIndex > -1 && ltIndex < endIndex) {
    endIndex = ltIndex
  }
  if (delimiterIndex > -1 && delimiterIndex < endIndex) {
    endIndex = delimiterIndex
  }

  const content = context.source.slice(0, endIndex)
  advanceBy(content.length)

  return {
    type: 'Text',
    content: decodeHtml(content),
  }
}

// 1. 当模板内容被解析完毕时
function isEnd(context, ancestors) {
  if (!context.source) return true

  for (let i = ancestors.length - 1; i >= 0; --i) {
    if (context.source.startWith(`</${ancestors[i].tag}`)) {
      return true
    }
  }
}
