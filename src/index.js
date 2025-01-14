import { createRenderer, shouldSetAsProps } from './renderer'

const renderer = createRenderer({
  createElement(tag) {
    return document.createElement(tag)
  },
  setElementText(el, text) {
    el.textContent = text
  },
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
  },
  createText(text) {
    return document.createTextNode(text)
  },
  setText(el, text) {
    el.nodeValue = text
  },
  createComment(comment) {
    return document.createComment(comment)
  },
  setComment(comment) {
    el.nodeValue = comment
  },
  // 把具体如何设置属性封装到自定义的选项中，增加跨平台能力
  patchProps(el, key, prevValue, nextValue) {
    // 使用正则匹配以 on 开头的属性，视其为事件（类似 React 的处理）
    if (/^on/.test(key)) {
      // el._vei 是对象，从而能够一次性保存多个不同类型的事件处理函数
      const invokers = el._vei || (el._vei = {})
      let invoker = invokers[key]
      const name = key.slice(2).toLowerCase()
      if (nextValue) {
        if (!invoker) {
          invoker = el._vei[key] = (e) => {
            // 如果事件发生的时间早于事件处理函数绑定的事件，则不执行事件处理函数
            if (e.timeStamp < invoker.attached) return
            // 如果 invoker.value 是数组，意味着同一个事件上绑定了多个不同的事件处理函数
            // 我们必须得逐个逐个调用它们
            if (Array.isArray(invoker.value)) {
              invoker.value.forEach((fn) => fn(e))
            } else {
              invoker.value(e)
            }
          }
          invoker.value = nextValue
          invoker.attached = performance.now()
          el.addEventListener(name, invoker)
        } else {
          invoker.value = nextValue
        }
      } else if (invoker) {
        el.removeEventListener(name, invoker)
      }
    }
    // 对 class 做特殊处理，因为直接设置 el.className 性能最好
    else if (key === 'class') {
      el.className = nextValue || ''
    }
    // 判断 el 元素上的 key 属性是否应该作为 DOM Property 被设置
    else if (shouldSetAsProps(el, key, nextValue)) {
      const type = typeof el[key]
      if (type === 'boolean' && value === '') {
        el[key] = true
      } else {
        el[key] = value
      }
    } else {
      el.setAttribute(key, value)
    }
  },
})
