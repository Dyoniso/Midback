
let halloween = { day : 31, month : 10 }
let natal = { day : 23, month : 12 }
let limit = parseInt(process.env.HOLIDAYS_RANGE)

if (isNaN(limit) || limit < 0) limit = 8

const holidaysCycle = Boolean(process.env.HOLIDAYS_CYCLE === 'true')

exports.checkHoliDays = () => {
    if (!holidaysCycle) return 'normal'

    let current = new Date()

    let currentMonth = (current.getMonth() + 1)
    let currentDate = current.getDate()

    if (currentMonth === halloween.month) {
        if (currentDate <= halloween.day) {
            let range = halloween.day - limit
            if (currentDate >= range) {
                return 'halloween'
            }
        }
    }
    if (currentMonth === natal.month) {
        if (currentDate <= natal.day) {
            let range = natal.day - limit
            if (currentDate >= range) {
                return 'natal'
            }
        }
    }

    return 'normal'
}

