$(document).ready(() => {
    let oldText
    let pause = false
    $('#redirectTimer').on('click', (e) => {
        e.preventDefault()
        history.go(-1)
    }).hover((e) => {
        oldText = $(e.target).text()
        pause = true
        $(e.target).text('Back to previous page')
    }, (e) => {
        pause = false
        $(e.target).text(oldText)
    })

    let c = 5
    let interval = setInterval(() => {
        if (!pause) {
            $('#redirectTimer').text(`You will be redirected on ${c}`)
            if (c-- <= 0) {
                clearInterval(interval)
                history.go(-1)
            }
        } 
    }, 1000)        
})