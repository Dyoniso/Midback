const MODE_BRIDGE = require('../bridge').MODE_BRIDGE
const Logger = require('./logger')
let logger
if (MODE_BRIDGE) {
    logger = new Logger(require('../bridge').P.name)
} else {
    logger = new Logger('app')
}

require('dotenv').config()
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')

const dirName = { 
    files : 'files',
    image : 'image',
    video : 'video',
    thumb : 'thumb',
    preview : 'preview',
    audio : 'audio'
}

exports.dirName = dirName
let filesPath = '/public/files/'

let bdgePath = ''
if (MODE_BRIDGE) {
    bdgePath = require('../bridge').path
    filesPath = bdgePath + filesPath
} else filesPath = '.' + bdgePath + filesPath

exports.registerFile = async(file) => {
    let mime = file.mime.split('/')[0]
    let path = filesPath + dirName.image + '/' + file.name
    if (mime === 'video') path = filesPath + '/' + dirName.video + '/' + file.name
    if (mime === 'audio') path = filesPath + '/' + dirName.audio + '/' + file.name
 
    if (!fs.existsSync(path)) fs.writeFileSync(path, Buffer.from(file.base64, 'base64'))
    delete file.base64

    let jpgFileName = await convertJPG(file)
    if (jpgFileName !== null) file.preview = jpgFileName
    else file.preview = ''

    let thumbName = await exports.generateThumb(file)
    if (thumbName !== null) file.thumbName = thumbName
    else file.thumbName = ''

    logger.info(`File: ${file.name} successful registered! `)
    return file
}

exports.deleteFile = async(file) => {
    let thumbPath = ''
    let mime = file.mime.split('/')[0]
    let path = filesPath + dirName.image + '/' + file.name
    if (mime === 'audio') path = filesPath + dirName.audio + '/' + file.name
    if (mime === 'video') {
        thumbPath = filesPath + dirName.thumb + '/' + file.thumb
        path = filesPath + dirName.video + '/' + file.name
    }
    
    if (fs.existsSync(path)) {
        fs.unlinkSync(path)
        logger.info(`File: ${file.name} successful deleted! `)
    } else {
        logger.error(`Error after delete. File path not exists (Path: ${path})`)
    }

    if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath)
        logger.info(`Video thumb: ${file.thumb} successful deleted!`)
    } else if (file.thumb !== '') {
        logger.info(`Error after delete video thumb. Thumb not exists (Path: ${path})`)
    }
}

async function convertJPG(file) {
    let filename = null
    let mime = file.mime.split('/')[1]
    if (mime === 'png' || mime === 'jpg' && file.size > 800000 || mime === 'jpeg' && file.size > 800000) {
        let filePath = filesPath + dirName.image + '/' + file.name
        if (fs.existsSync(filePath)) {
            filename = String(Math.floor(Math.random() * Date.now())).substr(0, 18)
            filename = filename +'.jpg'
            let outputPath = filesPath + dirName.preview + '/' + filename
            
            return await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                .on('end', () => {
                    logger.info('PNG to JPG Converted! ' + file.name)
                    return resolve(filename)
                })
                .on('error', (err) => {
                    logger.error('Error in convert file to jpg' + err)
                    filename = null
                    return resolve(filename)
                })
                .output(outputPath)
                .run()
            })
        }
    }
    return filename
}

exports.generateThumb = async(file) => {
    let thumbName = null
    let mime = file.mime.split('/')[0]
    if (mime === 'video') {
        let path = filesPath + dirName.video + '/' + file.name

        if (fs.existsSync(path)) {
            thumbName = String(Math.floor(Math.random() * Date.now())).substr(0, 18)
            thumbName = thumbName + '.jpg'

            return await new Promise((resolve, reject) => {
                ffmpeg(path)
                .on('end', () => {
                    logger.info('Video screenshot taken. Name: ' + file.name)
                    resolve(thumbName)
                })
                .on('error', (err) => {
                    logger.error('Error in salve video screenshot. ' + err)
                    thumbName = null
                    resolve(thumbName)
                })
                .screenshots({
                    count: 1,
                    filename : thumbName,
                    folder: filesPath + dirName.thumb
                })
            })
        }
    }
    return thumbName
}