const express = require('express')
const Logger = require('./api/logger')
const fs = require('fs')

exports.MODE_BRIDGE = false

exports.static = (app, path, route) => {
    let br = ''
    if (p.route && p.route.length > 0) br = '/'
    app.use(br + route + '/files', express.static(path + '/public/files'))
    app.use(br + route + '/lib', express.static(path + '/public/lib'))
    app.use(br + route + '/js', express.static(path + '/public/js'))
    app.use(br + route + '/css', express.static(path + '/public/css'))
    app.use(br + route + '/assets', express.static(path + '/public/assets'))
}

exports.init = (path, app, p) => {
    const logger = new Logger(p.name)

    module.exports.app = app
    exports.MODE_BRIDGE = true
    exports.path = path
    exports.P = p

    //Default Boards
    try {
        exports.boards = JSON.parse(fs.readFileSync(path + '/boards.json'))
    } catch (err) {
        throw new Error('Invalid board config. Please check boards.json')
    }

    let ms = Math.floor(process.hrtime()[0] * 1000000 + process.hrtime()[1] / 1000) + 'ms'
    exports.sync = require('./api/sync')
    exports.manager = require('./api/manager')
    exports.cron = require('./api/cron')
    logger.info(`Api Manager Started! [${ms}]`)
}