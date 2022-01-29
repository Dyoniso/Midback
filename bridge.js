const express = require('express')
const Logger = require('./api/logger')
const logger = new Logger('midback')
const fs = require('fs')

exports.MODE_BRIDGE = false

exports.init = (path, app, p) => {
    app.use('/' + p.route + '/files', express.static(path + '/public/files'))
    app.use('/' + p.route + '/pub', express.static(path + '/public/lib'))
    app.use('/' + p.route + '/pub', express.static(path + '/public/js'))
    app.use('/' + p.route + '/pub', express.static(path + '/public/css'))
    app.use('/' + p.route + '/pub', express.static(path + '/public/assets'))

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