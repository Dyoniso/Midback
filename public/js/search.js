$(document).ready((e) => {
    let bridgePath = $('#bridgePath').val()
    let board = $('#boardPath').val()
    let tin = null

    $('#searchContent').on('input', (e) => {
        let content = $(e.target).val()
        if (content.length > 30) return

        if (tin) clearTimeout(tin)
        tin = setTimeout((e) => {
            fetch(`${bridgePath}/${board}/tags`, {
                method: 'POST',
                headers: { 'Content-Type' : 'application/json' },
                body: JSON.stringify({
                    content : content
                })
            })
            .then(async(res) => {
                if (res && res.status === 200) {
                    let data = await res.json()
                    $('#searchContent').autocomplete({
                        source : data
                    })
                }
            })
        }, 500)
    })
})