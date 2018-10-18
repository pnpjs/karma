'use strict'

// 浏览器执行结果类
class BrowserResult {
  constructor (total = 0) {
    this.startTime = Date.now()

    this.total = total
    this.skipped = this.failed = this.success = 0
    this.netTime = this.totalTime = 0
    this.disconnected = this.error = false
  }

  // 执行时间
  totalTimeEnd () {
    this.totalTime = Date.now() - this.startTime
  }

  // 增加结果
  add (result) {
    if (result.skipped) {
      this.skipped++
    } else if (result.success) {
      this.success++
    } else {
      this.failed++
    }

    this.netTime += result.time
  }
}

module.exports = BrowserResult
