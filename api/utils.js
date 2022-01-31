const pug = require('pug')
const MODE_BRIDGE = require('../bridge').MODE_BRIDGE

exports.formatSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

exports.formatTimestamp = (UNIX_timestamp) => {
    if (!isNaN(parseInt(UNIX_timestamp))) UNIX_timestamp = parseInt(UNIX_timestamp)
    var a = new Date(UNIX_timestamp);
    
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();

    if (hour < 10) hour = '0'+hour
    if (min < 10) min = '0'+min
    if (sec < 10) sec = '0'+sec
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
    return time;
}

exports.htmlEnc = (s) => {
    return s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#39;')
      .replace(/"/g, '&#34;');
}

exports.generateHash = (length) => {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result
}

exports.checkRouteExists = (app, route) => {
    let exists = false
    app._router.stack.forEach((r, i) => {
        if (r.route) {
            if (r.route.path === route) return exists = true
        }
    })
    return exists
}

let bdgePath = ''
if (MODE_BRIDGE) bdgePath = require('../bridge').path
exports.renderHtml = (res, path, o) => {
    let access = './public/pug'
    let html = ''
    if (MODE_BRIDGE) {
        access = bdgePath + '/public/pug'
        html = o ? pug.renderFile(access + path, o) : pug.renderFile(access + path)
        return res.status(200).send(html).end()
    }
    return o ? res.render(access, o) : res.render(access)
}