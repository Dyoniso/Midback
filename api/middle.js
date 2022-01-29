const MODE_BRIDGE = require('../bridge').MODE_BRIDGE
if (MODE_BRIDGE) boards = require('../bridge').boards
else boards = require('../app').boards
const tables = require('./database').tables
const jwt = require('jsonwebtoken')
const fs = require('fs')
const rateLimit = require("express-rate-limit");
const db = require('./database')
const md5 = require('md5')

//TOKEN PUBLIC KEY
try {
    let path = '.'
    if (MODE_BRIDGE) path = require('../bridge').path
    if (!fs.existsSync(path + '/security')) fs.mkdirSync(path + '/security')
    PUBLIC_KEY = fs.readFileSync(path + '/security/jwtRS256.key.pub', 'utf8')
} catch (err) {
    throw new Error(`JWTRS256 public key not found. Generate a new key and place it in the folder: './security'`)        
}

const vipEnabled = Boolean(process.env.VIP_CYCLE === 'true')

exports.checkAdmin = async(req, res, next) => {
    let token = req.headers.cookie
    let pass = 'X-ADMIN='

    if (token && token.split(pass)[1]) {
        token = token.split(pass)[1].split(';')[0]
        jwt.verify(token, PUBLIC_KEY, async(err, decoded) => {
            req.admin = Boolean(!err)
            next()
        })
    } else {
        req.admin = false
        next()
    }
}

exports.checkVip = async(req, res, next) => {
    let token = req.headers.cookie

    let pass = 'X-VIP='

    if (vipEnabled === true && token && token.split(pass)[1]) {
        token = token.split(pass)[1].split(';')[0]

        jwt.verify(token, PUBLIC_KEY, async(err, decoded) => {
            if (!err) {
                q = null
                try {
                    q = await db.query(`SELECT id FROM ${tables.VIP} WHERE key = $1`, [decoded.key])
                } catch (err) {}

                if (q && q[0]) {
                    req.vip = true
                    req.vipKey = decoded.key
                    req.vipUid = decoded.uid
                } else {
                    req.vip = false    
                }
            } else {
                req.vip = false
            }
            next()
        })
        
    } else {
        req.vip = false
        next()
    }
}

exports.checkjwt = (req, res, next) => {
    let token = req.headers.cookie

    let pass = (boards.IMAGES.path).toUpperCase() + '-Passport='
    if (req.path.includes('/' + boards.VIDEOS.path)) pass = (boards.VIDEOS.path).toUpperCase() + '-Passport=' 
    if (req.path.includes('/' + boards.AUDIOS.path)) pass = (boards.AUDIOS.path).toUpperCase() + '-Passport=' 
  
    if (token && token.split(pass)[1]) {
        token = token.split(pass)[1].split(';')[0]

        jwt.verify(token, PUBLIC_KEY, (err, decoded) => {
            if (!err) {
                req.allowed = true
                req.uid = decoded.uid
                req.tokenExp = decoded.exp
                next()
            } else {
                req.allowed = false
                next()
            }
        })
    } else {
        req.allowed = false
        next()
    }
}

let limitObj = {
    windowMs: 6 * 60 * 1000,
    max: 10,
    skipFailedRequests: true,
    skipSuccessfulRequests: false,
    message : {
        status: 429,
        error: 'You are doing that too much. Please try again in 10 minutes.'
    }
}

exports.uidGen = async(req, res, next) => {
    if (req.ip) {
        const xip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
        req.uuid = md5(xip)
        
        let q = await db.query(`SELECT uid FROM ${tables.UIDS} WHERE uid = $1`, [req.uuid])
        if (!q[0] || q[0].length === 0) {
            await db.query(`INSERT INTO ${tables.UIDS}(uid) VALUES ($1)`, [ req.uuid ])
        }

        return next()
    }
    return res.status(401).send({
        code : 4632,
        err : 'Error creating access code'
    })
}

//LIMITER
limitObj.max = (req, res) => {
    let path = req.path.split('/')[2]
    if (path === 'passport') {
        if (!req.files || req.files.length <= 0) return 100
    }
    return 10
}
exports.limitter = rateLimit(limitObj) 

limitObj.max = 50
limitObj.windowMs = 10 * 60 * 1000,
limitObj.skipFailedRequests = false
exports.delLimiter = rateLimit(limitObj)

limitObj.max = 500
exports.indexLimitter = rateLimit(limitObj)

limitObj.max = (req, res) => {
    let path = req.path.split('/')[1]
    if (path === 'admin') {
        if (!req.body.password || req.body.password === '') return 100
    }
    return 10
}
exports.adminLimitter = rateLimit(limitObj)