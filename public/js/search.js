$(document).ready((e) => {
    let bridgePath = $('#bridgePath').val()
    let tin = null

    function getSuggests(content, el) {
        if (tin) clearTimeout(tin)
        tin = setTimeout((e) => {
            fetch(`${bridgePath}/suggestions`, {
                method: 'POST',
                headers: { 'Content-Type' : 'application/json' },
                body: JSON.stringify({
                    content : content
                })
            })
            .then(async(res) => {
                if (res && res.status === 200) {
                    let data = await res.json()
                    el.autocomplete({
                        source : data
                    })
                }
            })
        }, 500)
    }

    let orinI = $('#deepImages').attr('href')
    let orinV = $('#deepVideos').attr('href')
    let orinA = $('#deepAudios').attr('href')
    $('#searchInput').on('input', (e) => {
        let content = $(e.target).val()
        setTextInDeepSearchInput(content)
    })

    function setTextInDeepSearchInput(content) {
        $('#deepImages').attr('href', orinI + content)
        $('#deepVideos').attr('href', orinV + content)
        $('#deepAudios').attr('href', orinA + content)
    }
    if ($('#searchInput').val().length > 0) setTextInDeepSearchInput($('#searchInput').val())

    $('#searchContent, #tagInput, #searchInput').on('input', (e) => {
        let content = $(e.target).val()
        if (content.length > 30) return
        getSuggests(content, $(e.target))
    })
})