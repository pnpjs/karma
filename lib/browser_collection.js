'use strict'

const BrowserResult = require('./browser_result')
const helper = require('./helper')

// 浏览器集合对象
class BrowserCollection {
  constructor (emitter, browsers = []) {
    this.browsers = browsers
    this.emitter = emitter
  }

  // 添加浏览器
  add (browser) {
    this.browsers.push(browser)
    this.emitter.emit('browsers_change', this)
  }

  // 移除浏览器
  remove (browser) {
    if (helper.arrayRemove(this.browsers, browser)) {
      this.emitter.emit('browsers_change', this)
      return true
    }
    return false
  }

  // 根据浏览器 Id 获取浏览器
  getById (browserId) {
    return this.browsers.find((browser) => browser.id === browserId) || null
  }

  // 浏览器还是连接成功
  getNonReady () {
    return this.browsers.filter((browser) => !browser.isConnected())
  }

  // 所有浏览器连接成功
  areAllReady () {
    return this.browsers.every((browser) => browser.isConnected())
  }

  // 浏览器序列化
  serialize () {
    return this.browsers.map((browser) => browser.serialize())
  }

  // 计算退出状态码
  calculateExitCode (results, singleRunBrowserNotCaptured, failOnEmptyTestSuite, failOnFailingTestSuite) {
    // disconnected 获取设置了 singleRun，返回 1 退出浏览器
    if (results.disconnected || singleRunBrowserNotCaptured) {
      return 1
    } else if (results.success + results.failed === 0 && !failOnEmptyTestSuite) {
      // 成功执行，没有测试用例失败，并且不是测试用例为空并且失败的情况
      return 0
    } else if (results.error) {
      // 测试发生错误，返回 1 退出
      return 1
    } else if (failOnFailingTestSuite === false) {
      return 0 // Tests executed without infrastructure error, exit with 0 independent of test status.
    } else {
      // 失败的时候退出
      return results.failed ? 1 : 0
    }
  }

  // 获取结果
  getResults (singleRunBrowserNotCaptured, failOnEmptyTestSuite, failOnFailingTestSuite) {
    // 设置默认状态
    const results = { success: 0, failed: 0, error: false, disconnected: false, exitCode: 0 }
    // 对结果进行计数
    this.browsers.forEach((browser) => {
      results.success += browser.lastResult.success
      results.failed += browser.lastResult.failed
      results.error = results.error || browser.lastResult.error
      results.disconnected = results.disconnected || browser.lastResult.disconnected
    })

    // 计算退出状态码
    results.exitCode = this.calculateExitCode(results, singleRunBrowserNotCaptured, failOnEmptyTestSuite, failOnFailingTestSuite)
    return results
  }

  // 清空浏览器输出，清空 lastResult 字段
  clearResults () {
    this.browsers.forEach((browser) => {
      browser.lastResult = new BrowserResult()
    })
  }

  // 通过 clone 新建实例
  clone () {
    return new BrowserCollection(this.emitter, this.browsers.slice())
  }

  // Array APIs
  map (callback, context) {
    return this.browsers.map(callback, context)
  }

  // 一次执行
  forEach (callback, context) {
    return this.browsers.forEach(callback, context)
  }

  // 获取浏览器个数
  get length () {
    return this.browsers.length
  }
}

// 工厂方法获取 BrowserCollection 实例对象
BrowserCollection.factory = function (emitter) {
  return new BrowserCollection(emitter)
}

module.exports = BrowserCollection
