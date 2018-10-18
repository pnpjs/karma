'use strict'

const Promise = require('bluebird')
const net = require('net')

const NetUtils = {
  // 绑定可用端口，创建 server 并返回
  bindAvailablePort (port, listenAddress) {
    return new Promise((resolve, reject) => {
      const server = net.createServer()

      server
        .on('error', (err) => {
          server.close()
          // 端口号冲突的话端口端口自增
          if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
            server.listen(++port, listenAddress)
          } else {
            reject(new Error(`Failed to bind ${port}: ` + (err.stack || err)))
          }
        })
        .on('listening', () => {
          resolve(server)
        })
        .listen(port, listenAddress)
    })
  }
}

module.exports = NetUtils
