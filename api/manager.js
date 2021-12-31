const app = require('../app').app
const API_VERSION = require('../app').API_VERSION

const tables = require('../app').tables
const boards = require('../app').boards

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

const Logger = require('./logger')
const logger = new Logger('app')

//TOKEN PRIVATE KEY
try {
    if (!fs.existsSync('./security')) fs.mkdirSync('./security')
    PRIVATE_KEY = fs.readFileSync('./security/jwtRS256.key', 'utf8')
} catch (err) {
    throw new Error(`JWTRS256 private key not found. Generate a new key and place it in the folder: './security'`)
}

//ENV
let maxFiles = parseInt(process.env.MAX_FILES)
let pageSize = parseInt(process.env.PAGE_SIZE)
let adsKey = process.env.ADS_KEY
let archiveUrl = process.env.FILES_ACCESS_URL
let admPassword = process.env.ADMIN_PASSWORD
const vipEnabled = Boolean(process.env.VIP_CYCLE === 'true')
const goalEnabled = Boolean(process.env.GOAL_CYCLE === 'true')
const sameFiles = Boolean(process.env.SAME_FILES === 'true')
const passportEnabled = Boolean(process.env.PASSPORT === 'true')
let publicPost = Boolean(process.env.PUBLIC_POST === 'true')

if (!archiveUrl) archiveUrl = '/files'
if (!admPassword) admPassword = 'admin'
if (!adsKey) adsKey = '-1'
if (pageSize < 0 || isNaN(pageSize)) pageSize = 80
if (maxFiles < 3 || isNaN(maxFiles)) maxFiles = 10000

app.all('*', middle.uidGen, async(req, res, next) => {
    return next()      
})

app.get('/render/' + boards.AUDIOS.path, middle.checkjwt, middle.indexLimitter, (req, res) => {
    return renderBoards(req, res, true, boards.AUDIOS.path)
})

app.get('/render/' + boards.VIDEOS.path, middle.checkjwt, middle.indexLimitter, (req, res) => {
    return renderBoards(req, res, true, boards.VIDEOS.path)
})

if (boards.IMAGES.enabled === true) {
    app.get('/' + boards.IMAGES.path, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
        return renderBoards(req, res, false, boards.IMAGES.path)
    })

    app.get('/render/' + boards.IMAGES.path, middle.checkjwt, middle.indexLimitter, (req, res) => {
        return renderBoards(req, res, true, boards.IMAGES.path)
    })

    app.post(`/${boards.IMAGES.path}/passport`, upload.any(), middle.checkAdmin, middle.checkjwt, middle.checkVip, middle.limitter, async(req, res) => {
        return await passportLogic(req, res, boards.IMAGES.path)
    })

    app.delete(`/${boards.IMAGES.path}/del`, middle.checkAdmin, middle.delLimiter, async(req, res) => {
        return await deleteLogic(req, res, boards.IMAGES.path)
    })

    app.get(`/${boards.IMAGES.path}/touch`, async(req, res) => {
        return youngFilesLogic(req, res, boards.IMAGES.path)
    })

    if (passportEnabled === true) {
        app.get(`/${boards.IMAGES.path}/pass`, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
            return renderPass(req, res, boards.IMAGES.path)
        })
    }
}

if (boards.VIDEOS.enabled === true) {
    app.post(`/${boards.VIDEOS.path}/passport`, upload.any(), middle.checkAdmin, middle.checkjwt, middle.checkVip, middle.limitter, async(req, res) => {
        return await passportLogic(req, res, boards.VIDEOS.path)
    })

    app.delete(`/${boards.VIDEOS.path}/del`, middle.checkAdmin, middle.delLimiter, async(req, res) => {
        return await deleteLogic(req, res, boards.VIDEOS.path)
    })
    
    app.get(`/${boards.VIDEOS.path}/touch`, async(req, res) => {
        return youngFilesLogic(req, res, boards.VIDEOS.path)
    })

    app.get('/' + boards.VIDEOS.path, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
        return renderBoards(req, res, false, boards.VIDEOS.path)
    })

    if (passportEnabled === true) {
        app.get(`/${boards.VIDEOS.path}/pass`, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
            return renderPass(req, res, boards.VIDEOS.path)
        })
    }
}

if (boards.AUDIOS.enabled === true) {
    app.post(`/${boards.AUDIOS.path}/passport`, upload.any(), middle.checkAdmin, middle.checkjwt, middle.checkVip, middle.limitter, async(req, res) => {
        return await passportLogic(req, res, boards.AUDIOS.path)
    })
    
    app.get('/' + boards.AUDIOS.path, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
        return renderBoards(req, res, false, boards.AUDIOS.path)
    })

    app.delete(`/${boards.AUDIOS.path}/del`, middle.checkAdmin, middle.delLimiter, async(req, res) => {
        return await deleteLogic(req, res, boards.AUDIOS.path)
    })

    if (passportEnabled === true) {
        app.get(`/${boards.AUDIOS.path}/pass`, middle.checkAdmin, middle.checkVip, middle.checkjwt, middle.indexLimitter, (req, res) => {
            return renderPass(req, res, boards.AUDIOS.path)
        })
    }
}

app.get('/', middle.checkVip, async(req, res) => {
    return renderIndex(req, res)
})

app.post('/admin/login', upload.any(), middle.adminLimitter, async(req, res) => {
    return adminLogic(req, res)
})

app.get('/admin', middle.checkAdmin, async(req, res) => {
    return renderAdmin(req, res)
})

app.get('/admin/exit', middle.checkAdmin, async(req, res) => {
    return removeAdmin(req, res)
})

app.get(`/${boards.AUDIOS.path}/touch`, async(req, res) => {
    return youngFilesLogic(req, res, boards.AUDIOS.path)
})

//VIP System
if (vipEnabled === true) {
    app.get('/vip', middle.checkAdmin, middle.checkVip, async(req, res) => {
        return renderVip(req, res)
    })
    
    app.post('/vip/assign', upload.any(), async(req, res) => {
        return vipLogic(req, res)
    })
    
    app.put('/vip/generate', middle.checkAdmin, middle.limitter, async(req, res) => {
        return vipGenerateLogic(req, res)
    })
    
    app.put('/vip/delete', middle.checkAdmin, middle.limitter, async(req, res) => {
        return vipDeleteLogic(req, res)
    })
}

app.get('/info', (req, res) => {
    return renderInfo(req, res)
})

async function renderIndex(req, res) {
    let goal = await getGoalProgress()

    return res.render('./home/index.pug', { 
        boards : boards,
        adsKey : adsKey,
        vip : req.vip, 
        vipEnabled : vipEnabled,
        holidays : holidays.checkHoliDays(),
        stats : await getStats(),
        goal : goal,
        goalEnabled : goalEnabled,
     })
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
    if (!limit) limit = 100
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
    data.uids = await getUids(100)

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
    if (req.admin === true) return res.render('./adm/home.pug', { 
        API_VERSION : API_VERSION,
        goalEnabled : goalEnabled,
        vipEnabled : vipEnabled,
        data : await getAdminData(200),
        boards : boards,
    })
    else return res.render('./adm/admin.pug')
}

async function removeAdmin(req, res) {
    let admin = req.admin
    if (admin === true) {
        res.cookie('X-ADMIN', '')
    }
    return res.redirect('/')
}

async function adminLogic(req, res) {
    let uid = req.uid
    let password = String(req.body.password)

    if (password === admPassword) {
        const token = generateToken(uid, 99999)
        res.cookie('X-ADMIN', token)
        return res.redirect('/admin')
    }
    return res.render('templades/message.pug', { vipEnabled : vipEnabled, adsKey : adsKey, message : 'Your admin password does not match the password registered on the server. Try again' })
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
                return res.render('./vip/vipMessage.pug', { vipEnabled : vipEnabled, vipEnabled : vipEnabled, adsKey : adsKey, key : q, mode : 3 })
            }

            generateToken()
            return res.render('./vip/vipMessage.pug', { vipEnabled : vipEnabled, vipEnabled : vipEnabled, adsKey : adsKey, key : q, mode : 1 })
        }

    } catch (err) {
        logger.error('Error after check Vip Key: '+key)
    }

    return res.render('./vip/vipMessage.pug', { vipEnabled : vipEnabled, adsKey : adsKey, mode : 2 })
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
            q.expiresFormat = utils.formatTimestamp(q.expires)
            q.activate_uids = mask
        }
        return res.render('./vip/vipMessage.pug', { vipEnabled : vipEnabled, vipEnabled : vipEnabled, adsKey : adsKey, key : q, mode : 3 })
    }

    if (activate && activate.length > 0) {
        req.body.key = activate
        return await vipLogic(req, res)
    }

    if (admin === true) keys = await getVips()
    return res.render('./vip/vip.pug', { vipEnabled : vipEnabled, adsKey : adsKey, admin : admin,  keys : keys })
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
        if (files.length > 0) raw = pug.renderFile('./public/pug/templades/audioFrame.pug', {
            archiveUrl : archiveUrl + '/' + fm.dirName.audio,
            files : files,
            board : 3
        })

    } else if (board === boards.VIDEOS.path) {
        if (files.length > 0) raw = pug.renderFile('./public/pug/templades/itemFrame.pug', {
            archiveUrl : archiveUrl + '/' + fm.dirName.thumb,
            files : files,
            board : 1
        })
    } else {
        if (files.length > 0) raw = pug.renderFile('./public/pug/templades/itemFrame.pug', {
            archiveUrl : archiveUrl + '/' + fm.dirName.image,
            files : files,
            board : 0
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

    if (!page && isNaN(page)) page = 1
    if (isNaN(watch) || watch <= 0) watch = -1
    //if (!mode && admin === true) admin = false

    let hasViewVideo = Boolean((watch > 0 && board === boards.VIDEOS.path))

    if (!set || isNaN(set) || render === false) set = 0

    if (passportEnabled === true && !req.allowed) {
        if (render === true) return res.status(401).end()
        if (board === boards.AUDIOS.path) return res.redirect(`/${boards.AUDIOS.path}/pass`)
        else if (board === boards.VIDEOS.path) return res.redirect(`/${boards.VIDEOS.path}/pass`)
        else return res.redirect(`/${boards.IMAGES.path}/pass`)
    }

    let files = []
    let file = null
    let totalFiles = 0

    if (hasViewVideo === false) {
        if (render === false) totalFiles = await getFilesLength(board)
        files = await getFiles(page, pageSize, set, board)
    } else {
        file = await getFile(watch, board)
    }

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
    }

    if (board === boards.AUDIOS.path) {
        if (render === false) {
            renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.audio
            return res.render('./audio/boardAudios.pug', renderObj)
        } else {
            return res.end(pug.renderFile('./public/pug/templades/itemAudio.pug', {
                archiveUrl : archiveUrl + '/' + fm.dirName.audio,
                files : files,
            }))
        }

    } else if (board === boards.VIDEOS.path) {
        if (render === false) {
            if (hasViewVideo === false) {
                renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.thumb
                return res.render('./video/boardVideos.pug', renderObj)
            } else {
                let rfFiles = await getFiles(0, 24, watch, board, true)
                
                renderObj.archiveUrlRF = archiveUrl + '/' + fm.dirName.thumb
                renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.video
                renderObj.id = watch
                renderObj.file = file
                renderObj.files = rfFiles

                return res.render('./video/videoView.pug', renderObj)
            }
        } else {
            return res.end(pug.renderFile('./public/pug/templades/itemVideo.pug', {
                archiveUrl : archiveUrl + '/' + fm.dirName.thumb,
                files : files,
            }))
        }
    } else {
        if (render === false) {
            renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.image
            return res.render('./image/boardImages.pug', renderObj)
        } else {
            return res.end(pug.renderFile('./public/pug/templades/itemImage.pug', {
                archiveUrl : archiveUrl + '/' + fm.dirName.image,
                files : files,
            }))
        }
    }
}

function createPassportToken(uid, len, board, res) {
    let token = generateToken(uid, len)
    if (board === boards.AUDIOS.path) {
        res.cookie((boards.AUDIOS.path).toUpperCase() + '-Passport', token)
        return res.redirect('/' + boards.AUDIOS.path)
    } else if (board === boards.VIDEOS.path) {
        res.cookie((boards.VIDEOS.path).toUpperCase() + '-Passport', token)
        return res.redirect('/' + boards.VIDEOS.path)
    } else {
        res.cookie((boards.IMAGES.path).toUpperCase() + '-Passport', token)
        return res.redirect('/' + boards.IMAGES.path)
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
    }

    if (board === boards.AUDIOS.path) {
        if (req.allowed === true) return res.redirect('/' + boards.AUDIOS.path)
        renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.audio
        return res.render('./audio/passAudios.pug', renderObj)
        
    } else if (board === boards.VIDEOS.path) {
        if (req.allowed === true) return res.redirect('/' + boards.VIDEOS.path)
        renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.thumb
        return res.render('./video/passVideos.pug', renderObj)

    } else {
        if (req.allowed === true) return res.redirect('/' + boards.IMAGES.path)
        renderObj.archiveUrl = archiveUrl + '/' + fm.dirName.image
        return res.render('./image/passImages.pug', renderObj)
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

async function getFilesLength(board) {
    let count = 0
    try {
        let tl = tables.IMAGES
        if (board === boards.VIDEOS.path) tl = tables.VIDEOS
        if (board === boards.AUDIOS.path) tl = tables.AUDIOS

        let q = await db.query(`
            SELECT COUNT(*) FROM ${tl}
        `)

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

async function getFiles(page, limit, set, board, rnd) {
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
            q = await db.query(`SELECT * FROM ${tl} WHERE id != $2 ORDER by random() LIMIT $1`, [limit, set])

        } else {
            q = await db.query(`
            SELECT * FROM ${tl} ORDER by ID ${settable ? 'DESC' : 'ASC'} OFFSET $1 LIMIT $2
            `, [settable ? page * limit - limit : set, limit])
        }
        
        files = q
        for (r of files) {
            r.date = utils.formatTimestamp(r.date)
            r.size = utils.formatSize(r.size)
        }
        if (rnd === false) files = files.sort((x, y) => y.id - x.id)

    } catch (err) {
        logger.error('Error in get all files')
    }

    return files
}

async function passportLogic(req, res, board) {
    let admin = req.admin
    let uid = req.uuid
    let files = req.files
    let errorMessage = ''

    if (admin === true) {
        postEnabled = true
        publicPost = true
    }

    if (files.length <= 0 && req.vip === true && req.allowed === false) {
        return createPassportToken(uid, 9999, board, res)
    }

    if (admin === true && files.length <= 0) {
        return createPassportToken(uid, 9999, board, res)
    }
    
    if (board === boards.AUDIOS.path && files.length > 4) files = files.splice(0, 4)
    else if (board === boards.VIDEOS.path && files.length > 4) files = files.splice(0, 4)
    else if (files.length > 10) files = files.splice(0, 10)

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
        
        let sequence = base64.substr(0, base64.length > 250 ? 250 : base64.length)
        
        try {
            dims = sizeOf(Buffer.from(base64, 'base64'))

        } catch (err) {
            logger.error(`Error after get base64 dims.`)
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
            errorMessage = errorMessage + err + '<br>'
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

                        let thv = await fm.registerFile({
                            name : filename,
                            base64 : base64,
                            mime : f.mimetype,
                        })

                        if (board === boards.AUDIOS.path) {
                            await db.query(`
                                INSERT INTO ${tl}(uid, filename, mimetype, sequence, size, vip) 
                                VALUES ($1, $2, $3, $4, $5, $6)`, [uid, filename, f.mimetype, sequence, size, req.vip]
                            )

                        } else if (board === boards.VIDEOS.path) {
                            await db.query(`
                                INSERT INTO ${tl}(uid, filename, mimetype, sequence, size, thumb_name, vip) 
                                VALUES ($1, $2, $3, $4, $5, $6, $7)`, [uid, filename, f.mimetype, sequence, size, thv, req.vip]
                            )
                        } else {
                            await db.query(`
                                INSERT INTO ${tl}(uid, filename, mimetype, sequence, size, width, height, vip) 
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [uid, filename, f.mimetype, sequence, size, dims.width, dims.height, req.vip]
                            )
                        }

                        await appendGoal(uid, 1)
                        logger.info(`File info registered on db! Name: ${filename}, Mime:${mime}, Sequence: ${sequence}`) 

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
        errorMessage = 'file not found'
    }
    
    if (files.length === 0) {
        return res.render('templades/message.pug', { adsKey : adsKey, message : errorMessage })
    }
    createPassportToken(uid, files.length * 9999, board, res)
}