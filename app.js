require('dotenv').config()
const express = require('express')
const http = require('http')
const Logger = require('./api/logger')
const logger = new Logger('app')
const cookieParser = require('cookie-parser')
const fs = require('fs')

const app = express()

//VERSION
let API_VERSION = '2.1'
exports.API_VERSION = API_VERSION

//ENV
let HOSTNAME = process.env.HOSTNAME
let PORT = process.env.PORT || process.env.SERVER_PORT
const vipEnabled = Boolean(process.env.MB_VIP_CYCLE === 'true')
const goalEnabled = Boolean(process.env.MB_GOAL_CYCLE === 'true')
const holidaysEnabled = Boolean(process.env.MB_HOLIDAYS_CYCLE === 'true')
const sameFiles = Boolean(process.env.MB_SAME_FILES === 'true')
const passportEnabled = Boolean(process.env.MB_PASSPORT === 'true')
const publicPost = Boolean(process.env.MB_PUBLIC_POST === 'true')

if (!HOSTNAME) HOSTNAME = 'localhost'
if (!PORT) PORT = 5000

/* Midback Config */
// Default Boards
try {
    exports.boards = JSON.parse(fs.readFileSync('./boards.json'))
} catch (err) {
    throw new Error('Invalid board config. Please check boards.json')
}

app.set('view engine', 'pug')
app.set('views', __dirname + '/public/pug')
app.set('view options', { pretty: true })

app.use('/files', express.static('public/files'))
app.use('/lib', express.static('public/lib'))
app.use('/js', express.static('public/js'))
app.use('/css', express.static('public/css'))
app.use('/assets', express.static('public/assets'))

app.use(cookieParser())
app.use(express.json({ limit:'8mb' }))

const httpServer = http.createServer(app)
httpServer.listen(PORT, HOSTNAME, () => {
    logger.info(`Midback API Started! Listening on port ${HOSTNAME}:${PORT}`)
    if (!exports.boards.IMAGES.enabled && !exports.boards.AUDIOS.enabled && !exports.boards.VIDEOS.enabled ) {
        logger.info(`No boards enabled`)
    } else {
        logger.info(`Enabled Boards: ${exports.boards.IMAGES.enabled === true ? `/${exports.boards.IMAGES.path.toUpperCase()}/ - ${exports.boards.IMAGES.name},` : ''} ${exports.boards.VIDEOS.enabled === true ? `/${exports.boards.VIDEOS.path.toUpperCase()}/ - ${exports.boards.VIDEOS.name},` : ''} ${exports.boards.AUDIOS.enabled ? `/${exports.boards.AUDIOS.path.toUpperCase()}/ - ${exports.boards.AUDIOS.name}` : ''}`)
    }
    logger.info(`[SYSTEM STATUS]:
    - Vip System: ${vipEnabled === true ? 'OK' : 'disabled'}, 
    - Holidays System: ${holidaysEnabled === true ? 'OK' : 'disabled'}, 
    - Goal System: ${goalEnabled === true ? 'OK' : 'disabled'}
    - Passport Status: ${passportEnabled === true ? 'OK' : 'Free entrance'}
    - Post Access: ${publicPost === true ? 'Public' : 'Restricted'}
    - SPAM Files: ${sameFiles === true ? 'Accept same files' : 'Lock all the same files'}`)
})

module.exports.app = app

let ms = Math.floor(process.hrtime()[0] * 1000000 + process.hrtime()[1] / 1000) + 'ms'
exports.sync = require('./api/sync')
exports.manager = require('./api/manager')
exports.cron = require('./api/cron')
logger.info(`Api Manager Started! [${ms}]`)

app.use((req, res) => {
    res.status(404)
    if (req.accepts('html')) {
        res.render('templades/message.pug', { message : `404 Error - Url: '${req.url}' not found` })
        return
    }
})
