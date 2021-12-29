$(document).ready((e) => {
    let lastId = -1
    let showing = false
    let mode = $('#mode').val()

    $('.item-audio').on('click',  (e) => {
        e.preventDefault()
        let tar = $(e.target)
        let id = parseInt(tar.data('id'))

        if (mode === 'admin') return
        if (!id || isNaN(id)) return
        if (lastId !== id) {
            lastId = id
            swapAudio(tar)
            closeAudioPopup()
            openAudioPopup()
        } else {
            if (showing) {
                closeAudioPopup()
                stopAudio()
            } else {
                lastId = id
                openAudioPopup()
                playAudio()
            }
        }
    })

    $('.audio-close').on('click',  (e) => {
        closeAudioPopup()
        stopAudio()
    })

    function swapAudio(tar) {
        let name = tar.data('filename')
        if (name.length > 80) name = name.substr(0, 80) + '...'
        $('#playbackInfo').text(`No. ${tar.data('id')} - ${tar.data('date')} (${tar.data('size')})`)
        $('#playbackName').text(name)

        let a = $('#audioPlayer')
        a.children('source').attr('src', tar.data('src'))
        a[0].pause()
        a[0].load()
        a[0].oncanplaythrough = a[0].play()
    }

    function playAudio() {
        let a = $('#audioPlayer')
        a[0].oncanplaythrough = a[0].play()
    }

    function stopAudio() {
        let a = $('#audioPlayer')
        a[0].pause()
    }

    function openAudioPopup() {
        showing = true
        $("#audioPopup").slideDown(100)
    }
    
    function closeAudioPopup() {
        showing = false
        $("#audioPopup").slideUp(100)
    }
})