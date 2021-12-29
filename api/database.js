require('dotenv').config()
const promise = require('pg-promise')()
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Env config not found: DATABASE_URL, check your env file')

const db = promise(databaseUrl)
module.exports = {
    query: async(text, params) => await db.any(text, params)
}