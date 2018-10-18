'use strict'

const fs = require('graceful-fs')
const path = require('path')
const helper = require('./helper')

const log = require('./logger').create('plugin')

const IGNORED_PACKAGES = ['karma-cli', 'karma-runner.github.com']

function resolve (plugins, emitter) {
  const modules = []

  function requirePlugin (name) {
    log.debug(`Loading plugin ${name}.`)
    try {
      // 加载常规插件
      modules.push(require(name))
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND' && e.message.includes(name)) {
        log.error(`Cannot find plugin "${name}".\n  Did you forget to install it?\n  npm install ${name} --save-dev`)
      } else {
        log.error(`Error during loading "${name}" plugin:\n  ${e.message}`)
      }
      // 触发错误事件
      emitter.emit('load_error', 'plug_in', name)
    }
  }

  plugins.forEach(function (plugin) {
    // 判断插件名
    if (helper.isString(plugin)) {
      if (!plugin.includes('*')) {
        requirePlugin(plugin)
        return
      }
      // 加载自动匹配的插件
      const pluginDirectory = path.normalize(path.join(__dirname, '/../..'))
      const regexp = new RegExp(`^${plugin.replace('*', '.*')}`)

      // 加载插件
      log.debug(`Loading ${plugin} from ${pluginDirectory}`)
      // karma 同级目录，除去 karma-cli，加载其他 karma-*
      fs.readdirSync(pluginDirectory)
        .filter((pluginName) => !IGNORED_PACKAGES.includes(pluginName) && regexp.test(pluginName))
        .forEach((pluginName) => requirePlugin(`${pluginDirectory}/${pluginName}`))
    } else if (helper.isObject(plugin)) {
      // 插件是对象的话直接进行加载
      log.debug(`Loading inlined plugin (defining ${Object.keys(plugin).join(', ')}).`)
      modules.push(plugin)
    } else {
      // 插件加载失败
      log.error(`Invalid plugin ${plugin}`)
      emitter.emit('load_error', 'plug_in', plugin)
    }
  })

  return modules
}

exports.resolve = resolve
