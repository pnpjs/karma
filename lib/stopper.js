const http = require('http')
const cfg = require('./config')
const logger = require('./logger')
const helper = require('./helper')

// 结束 karma
exports.stop = function (config, done) {
  config = config || {}
  logger.setupFromConfig(config)
  const log = logger.create('stopper')
  // 回调方法
  done = helper.isFunction(done) ? done : process.exit
  config = cfg.parseConfig(config.configFile, config)

  // 发送结束进程请求
  const request = http.request({
    hostname: config.hostname,
    path: config.urlRoot + 'stop',
    port: config.port,
    method: 'GET'
  })

  // 成功返回，成功结束进程
  request.on('response', function (response) {
    if (response.statusCode === 200) {
      log.info('Server stopped.')
      done(0)
    } else {
      log.error(`Server returned status code: ${response.statusCode}`)
      done(1)
    }
  })

  // 结束失败
  request.on('error', function (e) {
    if (e.code === 'ECONNREFUSED') {
      log.error(`There is no server listening on port ${config.port}`)
      done(1, e.code)
    } else {
      throw e
    }
  })
  request.end()
}
