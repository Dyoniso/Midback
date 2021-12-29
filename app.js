require('dotenv').config()
const express = require('express')
const http = require('http')
const Logger = require('./api/logger')
const logger = new Logger('app')
const cookieParser = require('cookie-parser')

const app = express()

//ENV
let HOSTNAME = process.env.HOSTNAME
let PORT = process.env.PORT || process.env.SERVER_PORT
const vipEnabled = Boolean(process.env.VIP_CYCLE === 'true')
const goalEnabled = Boolean(process.env.GOAL_CYCLE === 'true')
const holidaysEnabled = Boolean(process.env.HOLIDAYS_CYCLE === 'true')

if (!HOSTNAME) HOSTNAME = 'localhost'
if (!PORT) PORT = 5000

/* Midback Config */
// Default Tables
exports.tables = {
    IMAGES  :   'images',
    VIDEOS  :   'videos',
    AUDIOS  :   'audios',
    VIP     :   'vip',
    GOAL    :   'goal',
    UIDS    :   'uids',
}

// Default Boards
exports.boards = {
    IMAGES   :   {
        name    :   'Images',
        path    :   'i',
    },
    VIDEOS   :   {
        name    :   'Videos',
        path    :   'v',
    },
    AUDIOS   :   {
        name    :   'Audio',
        path    :   'a',
    },
}

app.set('view engine', 'pug')
app.set('views', __dirname + '/public/pug')
app.set('view options', { pretty: true })

app.use('/files', express.static('public/files'))
app.use('/pub', express.static('public/lib'))
app.use('/pub', express.static('public/js'))
app.use('/pub', express.static('public/css'))
app.use('/pub', express.static('public/assets'))

app.use(cookieParser())
app.use(express.json({ limit:'8mb' }))

const httpServer = http.createServer(app)
httpServer.listen(PORT, HOSTNAME, () => {
    logger.info(`Midback API Started! Listening on port ${HOSTNAME}:${PORT}`)
    logger.info(`Enabled Boards: /${exports.boards.IMAGES.path.toUpperCase()}/ - ${exports.boards.IMAGES.name}, /${exports.boards.VIDEOS.path.toUpperCase()}/ - ${exports.boards.VIDEOS.name}, /${exports.boards.AUDIOS.path.toUpperCase()}/ - ${exports.boards.AUDIOS.name}`)
    logger.info(`Vip System: ${vipEnabled === true ? 'ok' : 'disabled'}, Holidays System: ${holidaysEnabled === true ? 'ok' : 'disabled'}, Goal System: ${goalEnabled === true ? 'ok' : 'disabled'}`)
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
