const MODE_BRIDGE = require('../bridge').MODE_BRIDGE
const Logger = require('./logger')
let logger
if (MODE_BRIDGE) {
    logger = new Logger('cron-'+require('../bridge').P.name)
} else {
    logger = new Logger('cron')
}

const db = require('./database')
const cron = require('node-cron')
const utils = require('./utils')
const tables = require('./database').tables

const vipEnabled = Boolean(process.env.MB_VIP_CYCLE === 'true')
const goalEnabled = Boolean(process.env.MB_GOAL_CYCLE === 'true')

if (goalEnabled === true || vipEnabled === true) {
    cron.schedule('0 0 0 * * *', async() => {
        logger.info('Starting system sync..') 
        
        if (vipEnabled === true) {
            logger.info('Checking if keys expired..')
            let keys = await db.query(`SELECT * FROM ${tables.VIP}`)
            let now = new Date()
            let delCount = 0
            for (f of keys) {
                let d = parseInt(f.expires)
                if (!isNaN(d)) {
                    let future = new Date(d)
                    if (now > future) {
                        delCount++
                        logger.info(`Key: ${f.key} expired in ${utils.formatTimestamp(d)}. This key will deleted!`)
                        db.query(`DELETE FROM ${tables.VIP} WHERE id = $1`, [f.id])
                    }
                }
            }
            logger.info(`VIP keys verified successfully. Total: ${keys.length} Deleted: ${delCount}`)   
        }

        if (goalEnabled === true) {
            logger.info('Checking if the goal was met')
            try {
                let q = await db.query(`SELECT * FROM ${tables.GOAL} ORDER by id DESC LIMIT 1`)
                q = q[0]
        
                if (q) {
                    if (q.amount >= q.amount_limit) {
                        let limitAppend = q.amount_limit + 10
                        await db.query(`INSERT INTO ${tables.GOAL}(amount_limit) VALUES ($1)`, [limitAppend])
                        logger.info('New goal cycle, started! Limit: '+ limitAppend)
                    } else {
                        logger.info(`Goal stats: [Total: ${q.amount_limit} - Current: ${q.amount}]`)
                    }
        
                } else {
                    await db.query(`INSERT INTO ${tables.GOAL} DEFAULT VALUES`)
                    logger.info('No goals found. starting a new goal cycle')
                }
                
            } catch (err) {
                logger.error('Error after check goal', err)
            }
        }
    })
}