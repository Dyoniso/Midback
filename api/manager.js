const MODE_BRIDGE = require('../bridge').MODE_BRIDGE
const Logger = require('./logger')
let app
let logger
let searchLogger
if (MODE_BRIDGE) {
    let p = require('../bridge').P
    boards = require('../bridge').boards
    app = require('../bridge').app
    logger = new Logger(require('../bridge').P.name)
    searchLogger = new Logger(require('../bridge').P.name + '-' + 'search')
    API_VERSION = p.version
} else {
    API_VERSION = require('../app').API_VERSION
    boards = require('../app').boards
    app = require('../app').app
    logger = new Logger('app')
    searchLogger = new Logger('search')
}

const tables = require('./database').tables
const jwt = require('jsonwebtoken')
const middle = require('./middle')
const multer = require('multer')
var storage = multer.memoryStorage()
const upload = multer({ storage : storage })
const db = require('./database')
const fs = require('fs')
const fm = require('./fileManager')
const utils = require('./utils')
const sizeOf = require('image-size')
const pug = require('pug')
const holidays = require('./holidays')
const crypto = require('crypto')

//TOKEN PRIVATE KEY
try {
    let path = '.'
    if (MODE_BRIDGE) path = require('../bridge').path
    if (!fs.existsSync(path + '/security')) fs.mkdirSync(path + '/security')
    PRIVATE_KEY = fs.readFileSync(path + '/security/jwtRS256.key', 'utf8')
} catch (err) {
    throw new Error(`JWTRS256 private key not found. Generate a new key and place it in the folder: './security'`)
}

//ENV
let maxFiles = parseInt(process.env.MB_MAX_FILES)
let pageSize = parseInt(process.env.MB_PAGE_SIZE)
let adsKey = process.env.MB_ADS_KEY
let archiveUrl = process.env.MB_FILES_ACCESS_URL
let admPassword = process.env.MB_ADMIN_PASSWORD
const vipEnabled = Boolean(process.env.MB_VIP_CYCLE === 'true')
const goalEnabled = Boolean(process.env.MB_GOAL_CYCLE === 'true')
const sameFiles = Boolean(process.env.MB_SAME_FILES === 'true')
const passportEnabled = Boolean(process.env.MB_PASSPORT === 'true')
let publicPost = Boolean(process.env.MB_PUBLIC_POST === 'true')

let bdgePath = ''
let bdgeRf = '.'
if (MODE_BRIDGE) {
    let route = require('../bridge').P.route
    let path = require('../bridge').path
    if (route && route.length > 0) bdgePath = '/' + route 
    if (path && path.length > 0) bdgeRf = path
}

if (utils.checkRouteExists(app, '/' + boards.IMAGES.path)) throw new Error('Conflicts between board path names. Please choose a different pathname')
if (utils.checkRouteExists(app, '/' + boards.VIDEOS.path)) throw new Error('Conflicts between board path names. Please choose a different pathname')
if (utils.checkRouteExists(app, '/' + boards.AUDIOS.path)) throw new Error('Conflicts between board path names. Please choose a different pathname')

if (!archiveUrl) archiveUrl = (bdgePath + '/files')
else archiveUrl = bdgePath + archiveUrl
if (!admPassword) admPassword = 'admin'
if (!adsKey) adsKey = '-1'
if (pageSize < 0 || isNaN(pageSize)) pageSize = 80
if (maxFiles < 3 || isNaN(maxFiles)) maxFiles = 10000

app.all(bdgePath + '/*', middle.uidGen, async(req, res, next) => {
    return next()      
})

app.get(bdgePath + '/search', middle.indexLimitter, (req, res) => {
    return renderSearch(req, res)
})

app.get(bdgePath + '/render/' + boards.AUDIOS.path, middle.checkjwt, middle.indexLimitter, (req, res) => {
    return renderBoards(req, res, true, boards.AUDIOS.path)
})

app.get(bdgePath + '/render/' + boards.VIDEOS.path, middle.checkjwt, middle.indexLimitter, (req, res) => {
    return renderBoards(req, res, true, boards.VIDEOS.path)
})

app.post(bdgePath + '/suggestions', middle.indexLimitter, (req, res) => {
    return suggestionsLogic(req, res)
})

if (boards.IMAGES.enabled === true) {
    app.get(bdgePath + '/' + boards.IMAGES.path, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
        return renderBoards(req, res, false, boards.IMAGES.path)
    })
    
    app.get(bdgePath + '/render/' + boards.IMAGES.path, middle.checkjwt, middle.indexLimitter, (req, res) => {
        return renderBoards(req, res, true, boards.IMAGES.path)
    })

    app.post(bdgePath + `/${boards.IMAGES.path}/passport`, upload.any(), middle.checkAdmin, middle.checkjwt, middle.checkVip, middle.limitter, async(req, res) => {
        return await passportLogic(req, res, boards.IMAGES.path)
    })

    app.delete(bdgePath + `/${boards.IMAGES.path}/del`, middle.checkAdmin, middle.delLimiter, async(req, res) => {
        return await deleteLogic(req, res, boards.IMAGES.path)
    })

    app.get(bdgePath + `/${boards.IMAGES.path}/touch`, async(req, res) => {
        return youngFilesLogic(req, res, boards.IMAGES.path)
    })

    if (passportEnabled === true) {
        app.get(bdgePath + `/${boards.IMAGES.path}/pass`, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
            return renderPass(req, res, boards.IMAGES.path)
        })
    }
}

if (boards.VIDEOS.enabled === true) {
    app.post(bdgePath + `/${boards.VIDEOS.path}/passport`, upload.any(), middle.checkAdmin, middle.checkjwt, middle.checkVip, middle.limitter, async(req, res) => {
        return await passportLogic(req, res, boards.VIDEOS.path)
    })

    app.delete(bdgePath + `/${boards.VIDEOS.path}/del`, middle.checkAdmin, middle.delLimiter, async(req, res) => {
        return await deleteLogic(req, res, boards.VIDEOS.path)
    })
    
    app.get(bdgePath + `/${boards.VIDEOS.path}/touch`, async(req, res) => {
        return youngFilesLogic(req, res, boards.VIDEOS.path)
    })

    app.get(bdgePath + '/' + boards.VIDEOS.path, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
        return renderBoards(req, res, false, boards.VIDEOS.path)
    })

    if (passportEnabled === true) {
        app.get(bdgePath + `/${boards.VIDEOS.path}/pass`, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
            return renderPass(req, res, boards.VIDEOS.path)
        })
    }
}

if (boards.AUDIOS.enabled === true) {
    app.post(bdgePath + `/${boards.AUDIOS.path}/passport`, upload.any(), middle.checkAdmin, middle.checkjwt, middle.checkVip, middle.limitter, async(req, res) => {
        return await passportLogic(req, res, boards.AUDIOS.path)
    })
    
    app.get(bdgePath + '/' + boards.AUDIOS.path, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
        return renderBoards(req, res, false, boards.AUDIOS.path)
    })

    app.delete(bdgePath + `/${boards.AUDIOS.path}/del`, middle.checkAdmin, middle.delLimiter, async(req, res) => {
        return await deleteLogic(req, res, boards.AUDIOS.path)
    })

    if (passportEnabled === true) {
        app.get(bdgePath + `/${boards.AUDIOS.path}/pass`, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
            return renderPass(req, res, boards.AUDIOS.path)
        })
    }
}

app.get(bdgePath + '/', middle.checkVip, async(req, res) => {
    return renderIndex(req, res)
})

app.post(bdgePath + '/admin/login', upload.any(), middle.adminLimitter, async(req, res) => {
    return adminLogic(req, res)
})

app.get(bdgePath + '/admin', middle.checkAdmin, async(req, res) => {
    return renderAdmin(req, res)
})

app.get(bdgePath + '/admin/exit', middle.checkAdmin, async(req, res) => {
    return removeAdmin(req, res)
})

app.get(bdgePath + `/${boards.AUDIOS.path}/touch`, async(req, res) => {
    return youngFilesLogic(req, res, boards.AUDIOS.path)
})

//VIP System
if (vipEnabled === true) {
    app.get(bdgePath + '/vip', middle.checkAdmin, middle.checkVip, async(req, res) => {
        return renderVip(req, res)
    })
    
    app.post(bdgePath + '/vip/assign', upload.any(), async(req, res) => {
        return vipLogic(req, res)
    })
    
    app.put(bdgePath + '/vip/generate', middle.checkAdmin, middle.limitter, async(req, res) => {
        return vipGenerateLogic(req, res)
    })
    
    app.put(bdgePath + '/vip/delete', middle.checkAdmin, middle.limitter, async(req, res) => {
        return vipDeleteLogic(req, res)
    })
}

app.get(bdgePath + '/info', (req, res) => {
    return renderInfo(req, res)
})

async function renderIndex(req, res) {
    let goal = await getGoalProgress()

    return utils.renderHtml(res, '/home/index.pug',  { 
        boards : boards,
        adsKey : adsKey,
        vip : req.vip, 
        vipEnabled : vipEnabled,
        holidays : holidays.checkHoliDays(),
        stats : await getStats(),
        goal : goal,
        goalEnabled : goalEnabled,
        bdgePath : bdgePath
    })
}

async function renderSearch(req, res) {
    let uid = req.uuid
    let search = req.query.q
    let files = await getRandomFiles(search)

    if (!search) search = ''
    if (search.length > 0 && files.length > 0) searchLogger.info(`User: ${uid} started search query: ${search}`)

    return utils.renderHtml(res, '/home/search.pug',  { 
        adsKey : adsKey,
        files : files,
        holidays : holidays.checkHoliDays(),
        bdgePath : bdgePath,
        search : search,
        boards : boards,
    })
}

async function suggestionsLogic(req, res, board) {
    let limit = 20
    let content = req.body.content
    let tls = [ tables.IMAGES, tables.VIDEOS, tables.AUDIOS ]
    let tags = []
    
    if (content.length <= 30) {
        for (tl of tls) {
            try {
                let vips = await db.query(`SELECT tag FROM ${tl} WHERE tag != '' AND vip = true AND tag LIKE $1 LIMIT 3`, `%${content}%`)
                for (p of vips) tags.push(p.tag)
                let pre = await db.query(`SELECT tag FROM ${tl} WHERE tag != '' AND vip = false AND tag LIKE $1 LIMIT  $2`, [`%${content}%`, limit])
                for (p of pre) tags.push(p.tag)
            } catch (err) {
                logger.error('Error after get tag list', err)
            }
        }
    }

    tags = tags.filter((item, pos, self) => {
        return self.indexOf(item) == pos;
    })
    return res.status(200).send(tags).end()
}

async function renderInfo(req, res) {
    let stats = await getStats()
    let boardInfo = JSON.parse(JSON.stringify(boards))
    delete boardInfo.IMAGES.enabled
    delete boardInfo.VIDEOS.enabled
    delete boardInfo.AUDIOS.enabled

    let totalSize = 0
    let qi = await db.query(`SELECT size FROM ${tables.IMAGES}`)
    let qv = await db.query(`SELECT size FROM ${tables.VIDEOS}`)
    let qa = await db.query(`SELECT size FROM ${tables.AUDIOS}`)

    for (s of qi) totalSize = totalSize + s.size
    for (s of qv) totalSize = totalSize + s.size
    for (s of qa) totalSize = totalSize + s.size

    let renderObj = {
        api_v : API_VERSION,
        files : stats,
        boardInfo : boardInfo,
        rawTotalSize : totalSize,
        totalSize : utils.formatSize(totalSize),
    }
    return res.status(200).send(renderObj).end()
}

async function getUids(limit) {
    if (!limit) limit = 15
    let uids = []

    try {
        uids = await db.query(`SELECT * FROM ${tables.UIDS} ORDER BY id DESC LIMIT $1`, [ limit ])
    } catch (err) {
        logger.error('Error after get uids', err)
    }

    for (u of uids) {
        u.raw_date = u.date
        u.date = utils.formatTimestamp(u.date)
    }
    return uids
}

async function getAdminData(limit) {
    if (!limit) limit = 100

    let data = {
        images : [],
        videos : [],
        audios : [],
    }

    data.stats = await getStats()
    data.goal = await getGoalProgress()
    data.vips = await getVips()
    data.uids = await getUids(15)

    for (v of data.vips) {
        v.rawExpires = v.expires
        v.expires = utils.formatTimestamp(new Date(parseInt(v.expires)))
    }

    async function pushData(tl) {
        return await db.query(`SELECT * FROM ${tl} ORDER BY id DESC limit $1`, [limit])
    }

    let q = []
    try {
        q = await pushData(tables.IMAGES)
        for(i of q) {
            data.images.push(i)
        }

        q = await pushData(tables.VIDEOS)
        for(i of q) {
            data.videos.push(i)
        }

        q = await pushData(tables.AUDIOS)
        for(i of q) {
            data.audios.push(i)
        }
        
        try {
            let total = 0
            let q = await db.query(`SELECT COUNT(*) FROM ${tables.UIDS}`)
            total = parseInt(q[0].count)
            if (isNaN(total) || total <= 0) total = 0
            data.totalAccess = total

        } catch (err) {
            logger.error('Error after get total access')
        }

    } catch (err) {
        logger.error('Error after get admin data', err)
    }
    return data
}

async function renderAdmin(req, res) {
    if (req.admin === true) return utils.renderHtml(res, '/adm/home.pug', { 
        API_VERSION : API_VERSION,
        goalEnabled : goalEnabled,
        vipEnabled : vipEnabled,
        data : await getAdminData(200),
        boards : boards,
        bdgePath : bdgePath,
        archiveUrl : archiveUrl,
        fmDirs : fm.dirName,
    })
    else return utils.renderHtml(res, '/adm/admin.pug', { bdgePath : bdgePath })
}

async function removeAdmin(req, res) {
    let admin = req.admin
    if (admin === true) {
        res.cookie('X-ADMIN', '')
    }
    return res.redirect(bdgePath + '/')
}

async function adminLogic(req, res) {
    let uid = req.uuid
    let password = String(req.body.password)

    if (password === admPassword) {
        const token = generateToken(uid, 99999)
        res.cookie('X-ADMIN', token)
        return res.redirect(bdgePath + '/admin')
    }
    return utils.renderHtml(res, '/templades/message.pug', { bdgePath : bdgePath, vipEnabled : vipEnabled, adsKey : adsKey, message : 'Your admin password does not match the password registered on the server. Try again' })
}

async function appendGoal(uid, len) {
    try {
        let q = await db.query(`
            UPDATE ${tables.GOAL} SET amount = amount + $1
            WHERE id IN (
                SELECT id FROM ${tables.GOAL} ORDER BY id DESC LIMIT 1
            )
            RETURNING amount_limit,amount,award
        `, [len])
        q = q[0]

        if (q) {
            if (!q.award || q.award.length === 0) {
                if (q.amount >= q.amount_limit) {
                    let now = new Date()
                    let expires = now.setDate(now.getDate() + 3)
                    let key = generateVipKey(uid, expires)

                    await db.query(`UPDATE ${tables.GOAL} SET award = $1`, [key])
                    logger.info('Goal successfully achieved! Award: '+key)
                    logger.info('The metar click will restart next day')
                }  
            }
        }

    } catch (err) {
        logger.error('Error in append goal', err)
    }
}

async function getGoalProgress() {
    let q = []
    let renderObj = {
        percent : 0,
        limit : 0,
        total : 0,
        error : false,
        award : '',
    }

    if (!goalEnabled) return renderObj

    try {
        q = await db.query(`SELECT * FROM ${tables.GOAL} ORDER by id DESC LIMIT 1`)
        q = q[0]

        if (q) {
            renderObj.award = q.award
            renderObj.total = q.amount
            renderObj.percent = (100 * q.amount) / q.amount_limit
            renderObj.limit = q.amount_limit
            renderObj.raw_begin = q.begin
            renderObj.begin = utils.formatTimestamp(q.begin)
        } else renderObj.error = true

    } catch (err) {
        renderObj.error = true
        logger.error('Error after get goal')
    }
    return renderObj
}

async function vipDeleteLogic(req, res) {
    let id = parseInt(req.body.keyId)
    let admin = req.admin

    if (admin === true && id && !isNaN(id)) {
        try {
            db.query(`DELETE FROM ${tables.VIP} WHERE id = $1`, [id])
            return res.status(200).end()

        } catch (err) {
            logger.error('Error after delete vip Key ID: '+ id)
        }
    }
    return res.status(500).end()
}

async function vipGenerateLogic(req, res) {
    let admin = req.admin
    if (admin === true) {
        let now = new Date()
        let expires = now.setMonth(now.getMonth() + 1)
        let key = generateVipKey(req.uuid, expires)
        if (key) return res.status(200).send({ key : key }).end()
    }
    return res.status(500).end()
}

async function vipLogic(req, res) {
    let key = req.body.key
    key = key.replace(/ /g, '').toUpperCase()
    let uid = req.uuid

    try {
        let q = await db.query(`SELECT * FROM ${tables.VIP} WHERE key = $1`, [key])
        q = q[0]
        if (q) {
            let uids = JSON.parse(q.activate_uids)
            let found = false

            for (u of uids) {
                if (u === uid) {
                    found = true
                    break   
                }
            }
            q.expiresFormat = utils.formatTimestamp(q.expires)
            q.uid = q.uid.replace(/(?<=.{28})./g, 'X')

            let mask = []
            for (f of uids) mask.push(maskUid(f))
            q.activate_uids = mask

            function maskUid(uid) {
                return uid.replace(/(?<=.{28})./g, 'X')
            }

            function generateToken() {
                res.cookie('X-VIP', jwt.sign({
                    uid : uid, key : key,
                }, PRIVATE_KEY, { algorithm : 'RS256', expiresIn : 999999 }))
            }

            if (!found) {
                uids.push(uid)
                q.activate_uids.push(maskUid(uid))
                db.query(`UPDATE ${tables.VIP} SET activate_uids = $1 WHERE id = $2`, [JSON.stringify(uids), q.id])
                logger.info(`!ALERT! User: ${uid} activate VIP KEY: ${key}`)

            } else {
                generateToken()
                return utils.renderHtml(res, '/vip/vipMessage.pug', { bdgePath : bdgePath, vipEnabled : vipEnabled, vipEnabled : vipEnabled, adsKey : adsKey, key : q, mode : 3 })
            }

            generateToken()
            return utils.renderHtml(res, '/vip/vipMessage.pug', { bdgePath : bdgePath, vipEnabled : vipEnabled, vipEnabled : vipEnabled, adsKey : adsKey, key : q, mode : 1 })
        }

    } catch (err) {
        logger.error('Error after check Vip Key: '+key)
    }

    return utils.renderHtml(res, '/vip/vipMessage.pug', { bdgePath : bdgePath, vipEnabled : vipEnabled, adsKey : adsKey, mode : 2 })
}

function generateVipKey(uid, expires) {
    expires = new Date(expires).getTime()
    let key = crypto.randomBytes(22).toString('hex')
    key = key.toUpperCase()

    try {
        db.query(`INSERT INTO ${tables.VIP}(uid, key, expires) VALUES ($1, $2, $3)`, [uid, key, expires])
        logger.info(`!KEY VIP CREATED! Alert new key vip registered! Uid Creator: ${uid} Key: ${key} Expires in ${Date(expires)}`)
        return key

    } catch (err) {
        logger.error('Error after generate vip key')
        return null
    }
}

async function renderVip(req, res) {
    let activate = req.query.activate
    let admin = req.admin
    let keys = []

    if (req.vip === true) {
        let q = await db.query(`SELECT * FROM ${tables.VIP} WHERE key = $1`, req.vipKey)
        q = q[0]

        if (q) {
            let uids = JSON.parse(q.activate_uids)
            let mask = []
            for (f of uids) mask.push(f.replace(/(?<=.{28})./g, 'X'))
            q.uid = q.uid.replace(/(?<=.{28})./g, 'X')
            q.expiresFormat = utils.formatTimestamp(q.expires)
            q.activate_uids = mask
        }
        return utils.renderHtml(res, '/vip/vipMessage.pug', { bdgePath : bdgePath, vipEnabled : vipEnabled, vipEnabled : vipEnabled, adsKey : adsKey, key : q, mode : 3 })
    }

    if (activate && activate.length > 0) {
        req.body.key = activate
        return await vipLogic(req, res)
    }

    if (admin === true) keys = await getVips()
    return utils.renderHtml(res, '/vip/vip.pug', { bdgePath : bdgePath, vipEnabled : vipEnabled, adsKey : adsKey, admin : admin,  keys : keys })
}

async function getVips(limit) {
    if (!limit) limit = 100
    let keys = []

    if (!vipEnabled) return keys

    try {
        let q = await db.query(`SELECT * FROM ${tables.VIP} ORDER BY id DESC LIMIT $1`, [limit])
        for (k of q) {
            k.date = utils.formatTimestamp(k.date)
            k.activate_count = JSON.parse(k.activate_uids).length
            k.expiresFormat = utils.formatTimestamp(k.expires)
            keys.push(k)
        }

    } catch (err) {
        logger.error('Error after get vip keys')
    }
    return keys
}

async function getStats() {
    let stats = { }

    if (boards.IMAGES.enabled === true) {
        stats.images = 0

        try {
            let q = await db.query(`SELECT COUNT(*) FROM ${tables.IMAGES}`)
            if (q[0] && q[0].count) stats.images = parseInt(q[0].count)
            if (stats.images < 0 || isNaN(stats.images)) stats.images = 0
    
        } catch (err) {
            logger.error('Error after get board stats {BOARD:IMAGES} ')
        }
    }

    if (boards.VIDEOS.enabled === true) {
        stats.videos = 0

        try {
            let q = await db.query(`SELECT COUNT(*) FROM ${tables.VIDEOS}`)
            if (q[0] && q[0].count) stats.videos = parseInt(q[0].count)
            if (stats.videos < 0 || isNaN(stats.videos)) stats.videos = 0
    
        } catch (err) {
            logger.error('Error after get board stats {BOARD:VIDEOS} ')
        }
    }

    if (boards.AUDIOS.enabled === true) {
        stats.audios = 0

        try {
            let q = await db.query(`SELECT COUNT(*) FROM ${tables.AUDIOS}`)
            if (q[0] && q[0].count) stats.audios = parseInt(q[0].count)
            if (stats.audios < 0 || isNaN(stats.audios)) stats.audios = 0
    
        } catch (err) {
            logger.error('Error after get board stats {BOARD:AUDIOS} ')
        }
    }

    return stats
}

async function youngFilesLogic(req, res, board) {
    let id = parseInt(req.query.id)

    if (isNaN(id) || id < 0) id = -1
    let files = await checkYoungFiles(id, 3, board)

    let raw = ''
    if (board === boards.AUDIOS.path) {
        if (files.length > 0) raw = pug.renderFile(bdgeRf + '/public/pug/templades/audioFrame.pug', {
            archiveUrl : archiveUrl + '/' + fm.dirName.audio,
            files : files,
            board : board,
            bdgePath : bdgePath,
        })

    } else if (board === boards.VIDEOS.path) {
        if (files.length > 0) raw = pug.renderFile(bdgeRf + '/public/pug/templades/itemFrame.pug', {
            archiveUrl : archiveUrl + '/' + fm.dirName.thumb,
            files : files,
            board : board,
            bdgePath, bdgePath,
        })
    } else {
        if (files.length > 0) raw = pug.renderFile(bdgeRf + '/public/pug/templades/itemFrame.pug', {
            archivePreviewUrl : archiveUrl + '/' + fm.dirName.preview,
            archiveUrl : archiveUrl + '/' + fm.dirName.image,
            files : files,
            board : board,
            bdgePath : bdgePath,
        })
    }
    return res.end(raw)
}

async function checkYoungFiles(id, limit, board) {
    let objs = []
    let q = []

    if (id === -1) return objs

    let last = -1
    try {
        if (board === boards.AUDIOS.path) last = await db.query(`SELECT id FROM ${tables.AUDIOS} ORDER BY id DESC LIMIT 1`)
        else if (board === boards.VIDEOS.path) last = await db.query(`SELECT id FROM ${tables.VIDEOS} ORDER BY id DESC LIMIT 1`)
        else last = await db.query(`SELECT id FROM ${tables.IMAGES} ORDER BY id DESC LIMIT 1`)
        
        last = parseInt(last[0].id)
        if (isNaN(last)) last = -1

    } catch (err) {
        logger.error('Error after get last id. ID: '+id)
    }
    
    if (last !== -1 && last > id) {
        try {
            if (board === boards.AUDIOS.path) q = await db.query(`SELECT * FROM ${tables.AUDIOS} ORDER BY id DESC LIMIT $1`, [limit])
            else if (board === boards.VIDEOS.path) q = await db.query(`SELECT * FROM ${tables.VIDEOS} ORDER BY id DESC LIMIT $1`, [limit])
            else q = await db.query(`SELECT * FROM ${tables.IMAGES} ORDER BY id DESC LIMIT $1`, [limit])
            if (q.length > 0) objs = q
            
        } catch (err) {
            logger.error('Error after check new files. Check your db', err)
        }
    }

    return objs
}

async function deleteLogic(req, res, board) {
    let id = parseInt(req.body.id)
    let admin = req.admin

    if (!id || isNaN(id)) id = -1
    if (admin === false) {
        logger.error(`Wrong admin access`)
        return res.status(401).end() 
    }

    try {
        let tl = tables.IMAGES
        if (board === boards.VIDEOS.path) tl = tables.VIDEOS
        if (board === boards.AUDIOS.path) tl = tables.AUDIOS

        let q = await db.query(`
            DELETE FROM ${tl} WHERE id = $1 RETURNING id,filename,mimetype
            ${board === boards.VIDEOS.path ? ',thumb_name' : ''}
        `, id)
        q = q[0]

        if (!q || !q.id) {
            logger.error(`Error afeter delete item. ID: ${id} not found!`)
            return res.status(404).end()
        }

        let delObj = { name : q.filename, mime : q.mimetype }
        if (board === boards.VIDEOS.path) delObj.thumb = q.thumb_name

        await fm.deleteFile(delObj)

        logger.info(`Successful delete item! ID: ${id}, UID: ${req.uuid}`)
        return res.status(200).end()

    } catch (err) {
        logger.error(`Error after delete item id: ${id}`)
    }
    return res.status(500).end('Internal server error')
}

async function renderBoards(req, res, render, board) {
    let mode = (req.query.mode === 'admin')
    let watch = parseInt(req.query.watch)
    let admin = req.admin
    let set = parseInt(req.query.set)
    let page = parseInt(req.query.page)
    let search = req.query.search
    let uid = req.uuid

    if (!page && isNaN(page)) page = 1
    if (isNaN(watch) || watch <= 0) watch = -1
    if (!search) search = ''
    if (search.length > 200) search = search.substr(200)
    if (search.length > 0) logger.info(`New search started! [ Query: ${search} ]`)
    //if (!mode && admin === true) admin = false

    let hasViewVideo = Boolean((watch > 0 && board === boards.VIDEOS.path))

    if (!set || isNaN(set) || render === false) set = 0

    if (passportEnabled === true && !req.allowed) {
        if (render === true) return res.status(401).end()
        if (board === boards.AUDIOS.path) return res.redirect(`${bdgePath}/${boards.AUDIOS.path}/pass`)
        else if (board === boards.VIDEOS.path) return res.redirect(`${bdgePath}/${boards.VIDEOS.path}/pass`)
        else return res.redirect(`${bdgePath}/${boards.IMAGES.path}/pass`)
    }

    let files = []
    let file = null
    let totalFiles = 0

    if (hasViewVideo === false) {
        if (render === false) totalFiles = await getFilesLength(board, search)
        files = await getFiles(page, pageSize, set, board, false, search)
    } else {
        file = await getFile(watch, board)
    }

    if (search.length > 0 && files.length > 0) searchLogger.info(`User: ${uid} started search query: ${search}`)

    let hdz = holidays.checkHoliDays()

    if (admin === true) publicPost = true

    let renderObj = {
        vipEnabled : vipEnabled,
        boards : boards,
        board : board,
        adsKey : adsKey,
        aclAdmin : mode,
        admin : admin,
        vip : req.vip,
        files : files,
        page : page,
        pageSize : pageSize,
        total : totalFiles,
        holidays : hdz,
        postEnabled : publicPost,
        search : search,
        bdgePath : bdgePath
    }

    if (board === boards.AUDIOS.path) {
        if (render === false) {
            renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.audio
            return utils.renderHtml(res, '/audio/boardAudios.pug', renderObj)
        } else {
            return res.end(pug.renderFile(bdgeRf + '/public/pug/templades/itemAudio.pug', {
                archiveUrl : archiveUrl + '/' + fm.dirName.audio,
                files : files,
                bdgePath : bdgePath,
            }))
        }

    } else if (board === boards.VIDEOS.path) {
        if (render === false) {
            if (hasViewVideo === false) {
                renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.thumb
                return utils.renderHtml(res, '/video/boardVideos.pug', renderObj)
            } else {
                let rfFiles = await getFiles(0, 24, watch, board, true)
                
                renderObj.archiveUrlRF = archiveUrl + '/' + fm.dirName.thumb
                renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.video
                renderObj.id = watch
                renderObj.file = file
                renderObj.files = rfFiles
                renderObj.files = renderObj.files.filter((f) => f.id !== file.id)

                return utils.renderHtml(res, '/video/videoView.pug', renderObj)
            }
        } else {
            return res.end(pug.renderFile(bdgeRf + '/public/pug/templades/itemVideo.pug', {
                archiveUrl : archiveUrl + '/' + fm.dirName.thumb,
                files : files,
                bdgePath : bdgePath,
            }))
        }
    } else {
        if (render === false) {
            renderObj.archivePreviewUrl = archiveUrl + '/' + fm.dirName.preview
            renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.image
            return utils.renderHtml(res, '/image/boardImages.pug', renderObj)
        } else {
            return res.end(pug.renderFile(bdgeRf + '/public/pug/templades/itemImage.pug', {
                archivePreviewUrl : archiveUrl + '/' + fm.dirName.preview,
                archiveUrl : archiveUrl + '/' + fm.dirName.image,
                files : files,
                bdgePath : bdgePath,
            }))
        }
    }
}

function createPassportToken(uid, len, board, res) {
    let token = generateToken(uid, len)
    if (board === boards.AUDIOS.path) {
        res.cookie((boards.AUDIOS.path).toUpperCase() + '-Passport', token)
        return res.redirect(bdgePath + '/' + boards.AUDIOS.path)
    } else if (board === boards.VIDEOS.path) {
        res.cookie((boards.VIDEOS.path).toUpperCase() + '-Passport', token)
        return res.redirect(bdgePath + '/' + boards.VIDEOS.path)
    } else {
        res.cookie((boards.IMAGES.path).toUpperCase() + '-Passport', token)
        return res.redirect(bdgePath + '/' + boards.IMAGES.path)
    }
}

async function renderPass(req, res, board) {
    let admin = req.admin
    let vip = req.vip

    if (admin === true) vip = true

    let hdz = holidays.checkHoliDays()
    let files = await getFiles(0, 3, 0, board)

    let renderObj = {
        vipEnabled : vipEnabled,
        boards : boards,
        adsKey : adsKey,
        vip : vip,
        holidays : hdz,
        board : board,
        mode : 'pass' ,
        files : files,
        bdgePath : bdgePath
    }

    if (board === boards.AUDIOS.path) {
        if (req.allowed === true) return res.redirect(bdgePath + '/' + boards.AUDIOS.path)
        renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.audio
        return utils.renderHtml(res, '/audio/passAudios.pug', renderObj)
        
    } else if (board === boards.VIDEOS.path) {
        if (req.allowed === true) return res.redirect(bdgePath + '/' + boards.VIDEOS.path)
        renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.thumb
        return utils.renderHtml(res, '/video/passVideos.pug', renderObj)

    } else {
        if (req.allowed === true) return res.redirect(bdgePath + '/' + boards.IMAGES.path)
        renderObj.archivePreviewUrl = archiveUrl + '/' + fm.dirName.preview
        renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.image
        return utils.renderHtml(res, '/image/passImages.pug', renderObj)
    }
}

function generateToken(uid, len) {
    return jwt.sign({ uid : uid }, PRIVATE_KEY, { algorithm : 'RS256', expiresIn : len * 5000 })
}

async function checkSameFiles(sequence, board) {
    try {
        let tl = tables.IMAGES
        if (board === boards.AUDIOS.path) tl = tables.AUDIOS
        if (board === boards.VIDEOS.path) tl = tables.VIDEOS

        let q = await db.query(`
            SELECT sequence FROM ${tl} WHERE sequence = $1
        `, [sequence])
    
        return Boolean(q[0] && q[0].sequence)

    } catch (err) {
        logger.error(`Error after check sequence: ${sequence}`)
    }
    return false
}

async function getFilesLength(board, search) {
    if (!search) search = ''
    let count = 0
    try {
        let tl = tables.IMAGES
        if (board === boards.VIDEOS.path) tl = tables.VIDEOS
        if (board === boards.AUDIOS.path) tl = tables.AUDIOS

        let q = await db.query(`
            SELECT COUNT(*) FROM ${tl} WHERE  
            id::varchar LIKE $1 OR tag LIKE $1 OR filename LIKE $1 OR mimetype LIKE $1
        `, [`%${search}%`])

        if (q[0] && q[0].count) count = q[0].count

    } catch (err) {
        logger.error('Error after get files length')
    }
    return count
}

async function getFile(id, board) {
    let file = null
    id = parseInt(id)

    if (isNaN(id) || id <= 0) id = -1

    if (board === boards.VIDEOS.path) file = await db.query(`SELECT * FROM ${tables.VIDEOS} WHERE id = $1`, [id])
    else file = await db.query(`SELECT * FROM ${tables.IMAGES} WHERE id = $1`, [id])
    if (file.length === 0 || file && !file[0].id) file = null
    else file = file[0]

    if (file !== null) {
        file.date = utils.formatTimestamp(file.date)
        file.size = utils.formatSize(file.size)
    }

    return file
}

async function getRandomFiles(search) {
    let limit = 20
    let files = []
    let slf = []
    let board = boards.IMAGES.path
    
    slf = await getFiles(0, limit, 0, board, false, search)
    for (f of slf) {
        try {
            f.fileType = f.mimetype.split('/')[0]
        } catch (err) { f.fileType = f.mime }
        f.board = board
        f.archiveUrl = archiveUrl + '/' + fm.dirName.image
        f.archivePreviewUrl = archiveUrl + '/' + fm.dirName.preview
        files.push(f)
    }

    board = boards.VIDEOS.path
    slf = await getFiles(0, limit, 0, board, false, search)
    for (f of slf) {
        try {
            f.fileType = f.mimetype.split('/')[0]
        } catch (err) { f.fileType = f.mime }
        f.board = board
        f.archiveUrl = archiveUrl + '/' + fm.dirName.thumb
        files.push(f)
    }
    
    board = boards.AUDIOS.path
    slf = await getFiles(0, limit, 0, board, false, search)
    for (f of slf) {
        try {
            f.fileType = f.mimetype.split('/')[0]
        } catch (err) { f.fileType = f.mime }
        f.board = board
        f.archiveUrl = archiveUrl + '/' + fm.dirName.audio
        files.push(f)
    }

    let shuffled = files
    if (!search || search.length.length === 0) {
        shuffled = shuffled.map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
    }
    return shuffled
}

async function getFiles(page, limit, set, board, rnd, search) {
    if (!search) search = ''
    if (!rnd) rnd = false
    if (!page) page = 1

    let files = []
    try {
        let settable = (!set || set && set <= 0)

        let tl = tables.IMAGES
        if (board === boards.VIDEOS.path) tl = tables.VIDEOS
        if (board === boards.AUDIOS.path) tl = tables.AUDIOS

        let q = []
        if (rnd === true) {
            q = await db.query(`
                SELECT * FROM ${tl} 
                WHERE id != $2 
                AND id::varchar LIKE $3 OR tag LIKE $3 OR filename LIKE $3 OR mimetype LIKE $3
                ORDER by random() 
                LIMIT $1
            `, [limit, set, `%${search}%`])

        } else {
            q = await db.query(`
                SELECT * FROM ${tl} WHERE 
                id::varchar LIKE $3 OR tag LIKE $3 OR filename LIKE $3 OR mimetype LIKE $3
                ORDER by ID ${settable ? 'DESC' : 'ASC'} OFFSET $1 LIMIT $2
            `, [settable ? page * limit - limit : set, limit, `%${search}%`])
        }
        
        files = q
        for (r of files) {
            r.mime = ''
            try {
                r.mime = r.mimetype.split('/').pop()
            } catch {}
            r.date = utils.formatTimestamp(r.date)
            r.size = utils.formatSize(r.size)
        }
        if (rnd === false) files = files.sort((x, y) => y.id - x.id)

    } catch (err) {
        logger.error('Error in get files')
    }
    return files
}

async function passportLogic(req, res, board) {
    let admin = req.admin
    let uid = req.uuid
    let files = req.files
    let errorMessage = ''
    let allowed = req.allowed
    let tag = req.body.tag

    if (!tag) tag = ''
    if (tag.length > 30) tag = tag.substring(0, 30)
    if (admin === true) {
        postEnabled = true
        publicPost = true
    }

    if (files.length <= 0 && req.vip === true && !allowed) {
        return createPassportToken(uid, 9999, board, res)
    }

    if (!allowed && admin === true && files.length <= 0) {
        return createPassportToken(uid, 9999, board, res)
    }
    
    if (board === boards.AUDIOS.path && files.length > 4) files = files.splice(0, 4)
    else if (board === boards.VIDEOS.path && files.length > 4) files = files.splice(0, 4)
    else if (files.length > 10) files = files.splice(0, 10)

    function generateFileSequence(base64) {
        let sequence = ''
        let maxLength = 30
        let eachLine = 3
        let insideLine = Math.round((base64.length / maxLength) / eachLine * 2)
        let count = 0
    
        for (let i = 0; i <= base64.length; i++) {
            count = count + (insideLine + eachLine) <= base64.length ? count + insideLine : count
            sequence += base64.substring(count - eachLine, count + eachLine)
            if (sequence.length > maxLength) break
        }
        return sequence
    }

    for (f of files) {
        f.originalname = f.originalname.replace(/[#?&]/gm, '')
        if (f.originalname.split('.')[0].length === 0) f.originalname = String(Math.floor(Math.random() * Date.now())).substr(0, 8) + '.' + f.originalname.split('.').pop()
        
        let filename = utils.htmlEnc(f.originalname)
        let mime = f.mimetype.split('/').pop()
        let size = f.size
        let base64 = Buffer.from(f.buffer).toString('base64')
        let dims = { width : 0, height : 0, }

        //Remove File
        function remove(f) {
            files = files.filter((i) => i !== f)
        }

        if (filename < 3) filename = utils.generateHash(12)
        if (filename > 120) filename = filename.substr(0, 120)
        
        let sequence = generateFileSequence(base64)
        
        try {
            dims = sizeOf(Buffer.from(base64, 'base64'))

        } catch (err) {
            logger.info(`Error after get base64 dims. Setting default value`)
        }
        if (!dims.width || dims.width < 0 || isNaN(dims.width)) dims.width = 0
        if (!dims.width || dims.height < 0 || isNaN(dims.height)) dims.height = 0

        //Errors
        function throwNotEnabledPostError() {
            errorMessage = `[!] You are not allowed to post on this board` + '<br>'
            logger.error(errorMessage)
            remove(f)
        }

        function throwErrorFileFormat() {
            let err = `[!] Mimetype not allowed: '${mime}'`
            errorMessage = errorMessage + err + '<br>'
            logger.error(err)
            remove(f)
        }

        function throwErrorFileSize(size) {
            let err = `[!] File size cannot be larger than ${size}`
            errorMessage = errorMessage + err + '<br>'
            logger.error(err)
            remove(f)
        }

        function throwErrorServer() {
            let err = `[!] Error after register file. Uid: ${uid}, Sequence: ${sequence}..`
            errorMessage = 'Internal Server Error. Try again later'
            logger.error(err)
            remove(f)
        }

        function throwErrorSameFiles() {
            let err = `[!] Error file sequence already exists Sequence: ${sequence.substr(0, sequence.length > 32 ? 32 : sequence.length)}..`
            errorMessage = errorMessage + err + '<br>'
            logger.error(err)
            remove(f)
        }

        //Function add file
        async function addFile() {
            try {  
                if (publicPost === true) {
                    if (sameFiles === true || await checkSameFiles(sequence, board) === false) {
                        let tl = tables.IMAGES
                        if (board === boards.VIDEOS.path) tl = tables.VIDEOS
                        if (board === boards.AUDIOS.path) tl = tables.AUDIOS

                        let nc = await db.query(`SELECT COUNT(filename) FROM ${tl} WHERE filename = $1`, [filename])
                        nc = nc[0]

                        if (nc && nc.count > 0) {
                            let rnd = String(Math.floor(Math.random() * Date.now())).substr(0, 8)
                            filename = filename.split('.')[0] + '-' + rnd + '.' + filename.split('.').pop()
                        }

                        try {
                            let totalFiles = 0
                            let cf = await db.query(`
                                SELECT COUNT(*) FROM ${tl}
                            `)
                            cf = cf[0]

                            if (cf && cf.count) totalFiles = parseInt(cf.count)

                            if (totalFiles > maxFiles) {
                                let delVal = await db.query(`
                                    DELETE FROM ${tl} WHERE id IN (
                                        SELECT id
                                        FROM ${tl}
                                        ORDER BY id ASC
                                        LIMIT $1
                                    ) RETURNING id,filename,mimetype
                                    ${board === boards.VIDEOS.path ? ',thumb_name' : ''}

                                `, [totalFiles - (maxFiles - 1)])
                                
                                for (f of delVal) {
                                    let delObj = { name : f.filename, mime : f.mimetype }
                                    if (board === boards.VIDEOS.path) delObj.thumb = f.thumb_name

                                    await fm.deleteFile(delObj)
                                }
                            }

                        } catch (err) {
                            logger.error('Error after check range of files')
                        }

                        let file = await fm.registerFile({
                            name : filename,
                            base64 : base64,
                            mime : f.mimetype,
                            size : size,
                        })

                        if (board === boards.AUDIOS.path) {
                            await db.query(`
                                INSERT INTO ${tl}(uid, filename, mimetype, sequence, size, vip, tag) 
                                VALUES ($1, $2, $3, $4, $5, $6, $7)`, [uid, filename, f.mimetype, sequence, size, req.vip, tag]
                            )

                        } else if (board === boards.VIDEOS.path) {
                            await db.query(`
                                INSERT INTO ${tl}(uid, filename, mimetype, sequence, size, thumb_name, vip, tag) 
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [uid, filename, f.mimetype, sequence, size, file.thumbName, req.vip, tag]
                            )
                        } else {
                            await db.query(`
                                INSERT INTO ${tl}(uid, filename, mimetype, sequence, size, width, height, vip, preview, tag) 
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [uid, filename, f.mimetype, sequence, size, dims.width, dims.height, req.vip, file.preview, tag]
                            )
                        }

                        await appendGoal(uid, 1)
                        logger.info(`File info registered on db! Name: ${file.name}, Mime:${mime}, Sequence: ${sequence}`) 

                    } else {
                        throwErrorSameFiles()
                    }
                } else {
                    throwNotEnabledPostError()
                }

            } catch (err) {
                throwErrorServer()
            }
        }

        //File Checker
        if (board === boards.AUDIOS.path) {
            if (boards.AUDIOS.type.includes(mime) === true) {
                if (size <= 10000000) {
                    await addFile()
                } else {
                    throwErrorFileSize('10mb')
                }
            } else {
                throwErrorFileFormat()
            }
        } else if (board === boards.VIDEOS.path) {
            if (boards.VIDEOS.type.includes(mime) === true) {
                if (size <= 10000000) {
                    await addFile()
                } else {
                    throwErrorFileSize('10mb')
                }
            } else {
                throwErrorFileFormat()
            }
        } else {
            if (boards.IMAGES.type.includes(mime) === true) {
                if (size <= 4000000) {
                    await addFile()
                } else {
                    throwErrorFileSize('4mb')
                }
            } else {
                throwErrorFileFormat()
            }
        }
    }

    if (files.length === 0 && errorMessage.length === 0) {
        errorMessage = 'Could not find the files. Add files to enter the next part'
    }
    
    if (files.length === 0) {
        return utils.renderHtml(res, '/templades/message.pug', { bdgePath : bdgePath, adsKey : adsKey, message : errorMessage })
    }
    createPassportToken(uid, files.length * 9999, board, res)
}