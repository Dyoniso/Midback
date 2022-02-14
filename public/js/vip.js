$(document).ready((e) => {
    let bridgePath = $('#bridgePath').val()
    const shParams = new URLSearchParams(location.search)
    let adminPassword = shParams.has('pass') ? shParams.get('pass') : ''

    $('#btnGenerateKey').on('click', (e) => {
        e.preventDefault()
        $('#btnGenerateKey').prop('disabled', true)

        fetch(`${bridgePath}/vip/generate`, {
            method: 'PUT',
            headers: { 'Content-Type' : 'application/json' },
            body: JSON.stringify({ adminPassword : adminPassword })
        })
        .then(async(res) => {
            if (res && res.status === 200) {
                let data = await res.json()
                let el = $('#keyInfo')

                let message = `- Key <span class="color-accent">${data.key}</span> successful created! -`
                el.addClass('text-success').html(message)
                $('#btnGenerateKey').prop('disabled', false)

            } else {
                $('#keyInfo').addClass('color-accent-2').text(`- Error after created Key. Status code [${res.status}] -`)
            }
        })
    })

    $('.btnDelete').on('click', (e) => {
        e.preventDefault()

        let el = $(e.target).parents('.key-content')
        let id = parseInt(el.data('id'))

        if (id && !isNaN(id)) {
            fetch(`${bridgePath}/vip/delete`, {
                method: 'PUT',
                headers: { 'Content-Type' : 'application/json' },
                body: JSON.stringify({ keyId : id, adminPassword : adminPassword })
            })
            .then(async(res) => {
                if (res && res.status === 200) {
                    el.remove()
                } else {
                    $('#keyInfo').html(`<span class="color-accent-2">Error after delete key ID: ${id} </span>`)
                }
            })
        }
    })
})