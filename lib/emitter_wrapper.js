'use strict'

// 事件管理器
class EmitterWrapper {
  constructor (emitter) {
    this.listeners = {}
    this.emitter = emitter
  }

  // 添加事件监听器
  addListener (event, listener) {
    this.emitter.addListener(event, listener)
    this.listeners[event] = this.listeners[event] || []
    this.listeners[event].push(listener)
    return this
  }

  // 添加事件监听
  on (event, listener) {
    return this.addListener(event, listener)
  }

  // 移除所有事件监听
  removeAllListeners (event) {
    const events = event ? [event] : Object.keys(this.listeners)
    events.forEach((event) => {
      this.listeners[event].forEach((listener) => {
        this.emitter.removeListener(event, listener)
      })
      delete this.listeners[event]
    })

    return this
  }
}

module.exports = EmitterWrapper
