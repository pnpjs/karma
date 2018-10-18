'use strict'

const log = require('./logger').create()

// 执行器
class Executor {
  constructor (capturedBrowsers, config, emitter) {
    this.capturedBrowsers = capturedBrowsers
    this.config = config
    this.emitter = emitter

    this.executionScheduled = false
    this.pendingCount = 0
    this.runningBrowsers = null

    // 设置事件监听
    this.emitter.on('run_complete', () => this.onRunComplete())
    this.emitter.on('browser_complete', () => this.onBrowserComplete())
  }

  // 计划执行
  schedule () {
    // 没有捕获到浏览器，提示手动打开浏览器
    if (this.capturedBrowsers.length === 0) {
      log.warn(`No captured browser, open ${this.config.protocol}//${this.config.hostname}:${this.config.port}${this.config.urlRoot}`)
      return false
    } else if (this.capturedBrowsers.areAllReady()) {
      // 捕获到浏览器，并且浏览器已经准备 ok
      log.debug('All browsers are ready, executing')
      log.debug(`Captured ${this.capturedBrowsers.length} browsers`)
      this.executionScheduled = false
      // 清除输出
      this.capturedBrowsers.clearResults()
      // 等待队列
      this.pendingCount = this.capturedBrowsers.length
      this.runningBrowsers = this.capturedBrowsers.clone()
      // 触发开始事件
      this.emitter.emit('run_start', this.runningBrowsers)
      // 向浏览器发送执行命令
      this.socketIoSockets.emit('execute', this.config.client)
      return true
    } else {
      // 捕获到浏览器，浏览器未准备完成
      log.info('Delaying execution, these browsers are not ready: ' + this.capturedBrowsers.getNonReady().join(', '))
      this.executionScheduled = true
      return false
    }
  }

  // 执行完成回调
  onRunComplete () {
    if (this.executionScheduled) {
      this.schedule()
    }
  }

  // 浏览器完成事件
  onBrowserComplete () {
    this.pendingCount--

    if (!this.pendingCount) {
      // Ensure run_complete is emitted in the next tick
      // so it is never emitted before browser_complete
      setTimeout(() => {
        this.emitter.emit('run_complete', this.runningBrowsers, this.runningBrowsers.getResults())
      })
    }
  }
}

// 执行器工厂方法，返回执行器实例
Executor.factory = function (capturedBrowsers, config, emitter) {
  return new Executor(capturedBrowsers, config, emitter)
}

module.exports = Executor
