export function lis(nums) {
  const keyIndex = nums.reduce((pre, cur, index) => {
    pre[cur] = index
    return pre
  }, {})

  if (nums.length === 0) return []

  const dp = Array(nums.length).fill(1)
  const prev = Array(nums.length).fill(-1)

  let maxLength = 1
  let maxIndex = 0

  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[i] > nums[j] && dp[i] < dp[j] + 1) {
        dp[i] = dp[j] + 1
        prev[i] = j
      }
    }
    if (dp[i] > maxLength) {
      maxLength = dp[i]
      maxIndex = i
    }
  }

  // 回溯获取最长递增子序列
  const lis = []
  let currentIndex = maxIndex
  while (currentIndex !== -1) {
    lis.push(nums[currentIndex])
    currentIndex = prev[currentIndex]
  }

  return lis.reverse().map((item) => keyIndex[item])
}

// 任务缓存队列
const queue = new Set()
let isFlushing = false
const p = Promise.resolve()

export function queueJob(job) {
  queue.add(job)
  if (!isFlushing) {
    isFlushing = true
    p.then(() => {
      try {
        queue.forEach((job) => job())
      } finally {
        isFlushing = false
        queue.length = 0
      }
    })
  }
}

// options: 组件自身的 props 选项中的定义
// propsData: 实际传递给组件的 props 数据
export function resolveProps(options, propsData) {
  const props = {}
  const attrs = {}

  for (const key in propsData) {
    // 以字符串 on 开头的 props 一律视为组件的自定义事件
    if (key in options || key.startsWith('on')) {
      // 如果为组件传递的 props 数据在组件自身的 props 选项中有定义
      // 则视为合法的 props
      props[key] = propsData[key]
    } else {
      // 否则视为 attrs
      attrs[key] = propsData[key]
    }
  }

  return [props, attrs]
}

// 判断两个 props 是否发生变化
export function hasPropsChanged(prevProps, nextProps) {
  const nextKeys = Object.keys(nextProps)
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  }

  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    // 有不相等的 props，则说明发生了变化
    if (nextProps[key] !== prevProps[key]) return true
  }
  return false
}

// 模拟接口请求
export function fetch() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject('err')
    }, 1000)
  })
}

// 重试机制
export function load(onError) {
  const p = fetch()
  return p.catch((err) => {
    return new Promise((resolve, reject) => {
      const retry = () => resolve(load(onError))
      const fail = () => reject(err)
      onError(retry, fail)
    })
  })
}
