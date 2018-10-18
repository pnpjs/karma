'use strict'

const Promise = require('bluebird')
// 任务队列模块
const Jobs = require('qjobs')

const log = require('./logger').create('launcher')

const baseDecorator = require('./launchers/base').decoratorFactory
const captureTimeoutDecorator = require('./launchers/capture_timeout').decoratorFactory
const retryDecorator = require('./launchers/retry').decoratorFactory
const processDecorator = require('./launchers/process').decoratorFactory

// TODO(vojta): remove once nobody uses it
const baseBrowserDecoratorFactory = function (
  baseLauncherDecorator,
  captureTimeoutLauncherDecorator,
  retryLauncherDecorator,
  processLauncherDecorator,
  processKillTimeout
) {
  return function (launcher) {
    baseLauncherDecorator(launcher)
    captureTimeoutLauncherDecorator(launcher)
    retryLauncherDecorator(launcher)
    processLauncherDecorator(launcher, processKillTimeout)
  }
}

// 浏览器启动器
function Launcher (server, emitter, injector) {
  this._browsers = []
  let lastStartTime

  const getBrowserById = (id) => this._browsers.find((browser) => browser.id === id)

  // 启动单个浏览器
  this.launchSingle = (protocol, hostname, port, urlRoot, upstreamProxy, processKillTimeout) => {
    // 设置代理信息
    if (upstreamProxy) {
      protocol = upstreamProxy.protocol
      hostname = upstreamProxy.hostname
      port = upstreamProxy.port
      urlRoot = upstreamProxy.path + urlRoot.substr(1)
    }

    // 返回一个方法
    return (name) => {
      let browser
      const locals = {
        id: ['value', Launcher.generateId()],
        name: ['value', name],
        processKillTimeout: ['value', processKillTimeout],
        baseLauncherDecorator: ['factory', baseDecorator],
        captureTimeoutLauncherDecorator: ['factory', captureTimeoutDecorator],
        retryLauncherDecorator: ['factory', retryDecorator],
        processLauncherDecorator: ['factory', processDecorator],
        baseBrowserDecorator: ['factory', baseBrowserDecoratorFactory]
      }

      // TODO(vojta): determine script from name
      if (name.includes('/')) {
        name = 'Script'
      }

      try {
        browser = injector.createChild([locals], ['launcher:' + name]).get('launcher:' + name)
      } catch (e) {
        // 启动失败报错，没有对应浏览器的启动器
        if (e.message.includes(`No provider for "launcher:${name}"`)) {
          log.error(`Cannot load browser "${name}": it is not registered! Perhaps you are missing some plugin?`)
        } else {
          log.error(`Cannot load browser "${name}"!\n  ` + e.stack)
        }

        // 发送浏览器加载失败事件
        emitter.emit('load_error', 'launcher', name)
        return
      }

      // 添加任务
      this.jobs.add((args, done) => {
        log.info(`Starting browser ${browser.displayName || browser.name}`)

        browser.on('browser_process_failure', () => done(browser.error))

        browser.on('done', () => {
          if (!browser.error && browser.state !== browser.STATE_RESTARTING) {
            done(null, browser)
          }
        })

        // 打开浏览器页面
        browser.start(`${protocol}//${hostname}:${port}${urlRoot}`)
      }, [])

      // 执行任务
      this.jobs.run()
      // 启动成功的浏览器添加到 _browsers 中
      this._browsers.push(browser)
    }
  }

  // 批量启动浏览器，设置最大启动数量
  this.launch = (names, concurrency) => {
    log.info(`Launching browsers ${names.join(', ')} with concurrency ${concurrency === Infinity ? 'unlimited' : concurrency}`)
    this.jobs = new Jobs({ maxConcurrency: concurrency })

    lastStartTime = Date.now()

    if (server.loadErrors.length) {
      this.jobs.add((args, done) => done(), [])
    } else {
      names.forEach((name) => injector.invoke(this.launchSingle, this)(name))
    }

    this.jobs.on('end', (err) => {
      log.debug('Finished all browsers')

      if (err) {
        log.error(err)
      }
    })

    this.jobs.run()

    return this._browsers
  }

  this.launch.$inject = [
    'config.browsers',
    'config.concurrency',
    'config.processKillTimeout'
  ]

  this.launchSingle.$inject = [
    'config.protocol',
    'config.hostname',
    'config.port',
    'config.urlRoot',
    'config.upstreamProxy',
    'config.processKillTimeout'
  ]

  // 强制结束浏览器进程，并执行回调
  this.kill = (id, callback) => {
    callback = callback || function () {}
    const browser = getBrowserById(id)

    if (browser) {
      browser.forceKill().then(callback)
      return true
    }
    process.nextTick(callback)
    return false
  }

  // 重启浏览器
  this.restart = (id) => {
    const browser = getBrowserById(id)
    if (browser) {
      browser.restart()
      return true
    }
    return false
  }

  // 结束所有浏览器进程
  this.killAll = (callback) => {
    callback = callback || function () {}
    log.debug('Disconnecting all browsers')

    if (!this._browsers.length) {
      return process.nextTick(callback)
    }

    Promise.all(
      this._browsers
        .map((browser) => browser.forceKill())
    ).then(callback)
  }

  // 抓取所有浏览器信息
  this.areAllCaptured = () => this._browsers.every((browser) => browser.isCaptured())

  // 抓取浏览器标记信息
  this.markCaptured = (id) => {
    const browser = getBrowserById(id)
    if (browser) {
      browser.markCaptured()
      log.debug(`${browser.name} (id ${browser.id}) captured in ${(Date.now() - lastStartTime) / 1000} secs`)
    }
  }

  // 发送退出事件
  emitter.on('exit', this.killAll)
}

// 注入三个对象
Launcher.$inject = ['server', 'emitter', 'injector']
// id 生成器方法
Launcher.generateId = () => Math.floor(Math.random() * 100000000).toString()

exports.Launcher = Launcher
