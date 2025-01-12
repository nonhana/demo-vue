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
