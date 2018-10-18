'use strict'

const path = require('path')
const fs = require('graceful-fs')
const rimraf = require('rimraf')
const log = require('./logger').create('temp-dir')

const TEMP_DIR = require('os').tmpdir()

module.exports = {
  // 获取临时文件夹目录
  getPath (suffix) {
    return path.normalize(TEMP_DIR + suffix)
  },

  // 创建临时文件夹目录
  create (path) {
    log.debug(`Creating temp dir at ${path}`)

    try {
      fs.mkdirSync(path)
    } catch (e) {
      log.warn(`Failed to create a temp dir at ${path}`)
    }

    return path
  },

  // 删除临时文件夹目录
  remove (path, done) {
    log.debug(`Cleaning temp dir ${path}`)
    rimraf(path, done)
  }
}
