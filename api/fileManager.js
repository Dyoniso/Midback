require('dotenv').config()
const Logger = require('./logger')
const logger = new Logger('app')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')

const MODE_BRIDGE = require('../bridge').MODE_BRIDGE

const dirName = { 
    files : 'files',
    image : 'image',
    video : 'video',
    thumb : 'thumb',
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

    let thumbName = ''
    if (mime === 'video') {
        try {
            thumbName = await exports.generateThumb({ name : file.name })
        } catch (err) {
           logger.error('Error after create video thumb', err)        
        }
    }

    logger.info(`File: ${file.name} successful registered! `)
    return thumbName
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

exports.generateThumb = async(file) => {
    let path = filesPath + dirName.video + '/' + file.name

    if (fs.existsSync(path)) {
        let thumbName = String(Math.floor(Math.random() * Date.now())).substr(0, 18)
        thumbName = thumbName + '.jpg'

        return await new Promise((resolve, reject) => {
            ffmpeg(path)
            .on('end', () => {
                logger.info('Video screenshot taken. Name: ' + file.name)
                resolve(thumbName)
            })
            .on('error', (err) => {
                logger.error('Error in salve video screenshot. ' + err)
                reject(err)
            })
            .screenshots({
                count: 1,
                filename : thumbName,
                folder: filesPath + dirName.thumb
            })
        })
    }
}