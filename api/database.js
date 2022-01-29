require('dotenv').config()
const promise = require('pg-promise')()

const MODE_BRIDGE = require('../bridge').MODE_BRIDGE
if (MODE_BRIDGE) {
    let p = require('../bridge').P
    databaseUrl = process.env.DATABASE_URL + '/' + p.db
} else databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Env config not found: DATABASE_URL, check your env file')

const db = promise(databaseUrl)
module.exports = {
    query: async(text, params) => await db.any(text, params)
}

// Default Tables
module.exports.tables = {
    IMAGES  :   'images',
    VIDEOS  :   'videos',
    AUDIOS  :   'audios',
    VIP     :   'vip',
    GOAL    :   'goal',
    UIDS    :   'uids',
}