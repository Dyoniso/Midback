const express = require('express')
const Logger = require('./api/logger')
const fs = require('fs')

exports.MODE_BRIDGE = false

//ENV
const vipEnabled = Boolean(process.env.MB_VIP_CYCLE === 'true')
const goalEnabled = Boolean(process.env.MB_GOAL_CYCLE === 'true')
const holidaysEnabled = Boolean(process.env.MB_HOLIDAYS_CYCLE === 'true')
const sameFiles = Boolean(process.env.MB_SAME_FILES === 'true')
const passportEnabled = Boolean(process.env.MB_PASSPORT === 'true')
const publicPost = Boolean(process.env.MB_PUBLIC_POST === 'true')

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

    if (!exports.boards.IMAGES.enabled && !exports.boards.AUDIOS.enabled && !exports.boards.VIDEOS.enabled ) {
        logger.info(`No boards enabled`)
    } else {
        logger.info(`Enabled Boards: ${exports.boards.IMAGES.enabled === true ? `/${exports.boards.IMAGES.path.toUpperCase()}/ - ${exports.boards.IMAGES.name},` : ''} ${exports.boards.VIDEOS.enabled === true ? `/${exports.boards.VIDEOS.path.toUpperCase()}/ - ${exports.boards.VIDEOS.name},` : ''} ${exports.boards.AUDIOS.enabled ? `/${exports.boards.AUDIOS.path.toUpperCase()}/ - ${exports.boards.AUDIOS.name}` : ''}`)
    }
    console.log(`
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    Z                                         Z
    Z [MIDBACK STATUS]:                       Z
    Z  - Vip System: ${vipEnabled === true ? 'OK                       Z' : 'disabled                 Z'} 
    Z  - Holidays System: ${holidaysEnabled === true ? 'OK                  Z' : 'disabled            Z'}
    Z  - Goal System: ${goalEnabled === true ? 'OK                      Z' : 'disabled                Z'}
    Z  - Passport Status: ${passportEnabled === true ? 'OK                  Z' : 'Free entrance       Z'}
    Z  - Post Access: ${publicPost === true ? 'Public                  Z' : 'Restricted              Z'}
    Z  - SPAM Files: ${sameFiles === true ? 'Accept Same Files        Z' : 'Lock all the same files  Z'}
    Z                                         Z
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
                                  7Retro Engine
    `)                                  
}