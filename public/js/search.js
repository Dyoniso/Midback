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

    $('#searchContent, #tagInput, #searchInput').on('input', (e) => {
        let content = $(e.target).val()
        if (content.length > 30) return
        getSuggests(content, $(e.target))
    })
})