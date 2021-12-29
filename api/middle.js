const tables = require('../app').tables
const boards = require('../app').boards
const jwt = require('jsonwebtoken')
const fs = require('fs')
const rateLimit = require("express-rate-limit");
const PUBLIC_KEY = fs.readFileSync('./security/jwtRS256.key.pub', 'utf8')
const db = require('./database')
const md5 = require('md5')

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
    message: {
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

exports.limitter = rateLimit(limitObj)

limitObj.max = 50
limitObj.windowMs = 10 * 60 * 1000,
limitObj.skipFailedRequests = false
exports.delLimiter = rateLimit(limitObj)

limitObj.max = 500
exports.indexLimitter = rateLimit(limitObj)

limitObj.max = 10
exports.adminLimitter = rateLimit(limitObj)