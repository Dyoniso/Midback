$(document).ready(async() => {
    let bridgePath = $('#bridgePath').val()
    let files = []

    $('.drag-file').on('dragleave', (e) => {
        e.preventDefault()
        $('.drag-file').removeAttr('style', '')
    })

    $('.drag-file').on('dragover', (e) => {
        e.preventDefault()
        $('.drag-file').css('border', '4px dashed rgb(43 255 0 / 69%)')
    })

    $('.drag-file').on('drop', (e) => {
        e.preventDefault()
        $('.drag-file').removeAttr('style', '')

        let dt = e.originalEvent.dataTransfer
        if (dt && dt.files.length) {

            for (f of dt.files) {
                let reader = new FileReader()
                reader.onload = (b) => {
                    updateFileList({
                        id : b.target.id,
                        base64 : b.target.result,
                        name : b.target.filename,
                        type : b.target.type,
                        size : b.target.size
                    })
                }
                reader.size = f.size
                reader.type = f.type
                reader.id = files.length + 1
                reader.filename = f.name
                reader.readAsDataURL(f)
                
                files.push(f)
            }

            const dT = new DataTransfer();
            for (f of files) dT.items.add(f)
            $('#postFile')[0].files = dT.files
        }
    })

    function updateFileList(file) {
        let b64 = file.base64
        let filename = file.name
        let id = file.id
        let type = file.type.split('/')[0]
        let size = file.size

        let previewFrame = `<img id="imgItem-${id}" src="${b64}" onerror="this.src='/pub/404.jpg'"/>`
        if (type === 'video') previewFrame = `<video id="videoItem-${id}" controls="" loop=""><source src="${b64}" /></video>`
        if (type === 'audio') previewFrame = `<audio id="audioItem-${id}" controls="" loop=""><source src="${b64}" /></audio>`

        $('#filePreview').append(`
            <div class="file-container" data-name="${filename}">
                ${previewFrame}
                <div class="btnRemove"> X </div>
                <div class="file-name"> ${filename} <div class="file-size">(${size}KB)</div></div>
            </div>
        `)

        $('.btnRemove').off('click').on('click', (e) => {
            removeItem(e)
        })
    }

    $('#postFile').on('change', async(e) => {
        let el = e.target

        let count = 0

        if (el.files.length > 10) el.files = el.files.splice(0, 10)

        for (f of el.files) {
            let reader = new FileReader()
            reader.onload = (b) => {
                updateFileList({
                    id : b.target.id,
                    name : b.target.filename,
                    base64 : b.target.result,
                    type : b.target.type,
                    size : b.target.size,
                })                
            }
            reader.size = f.size
            reader.type = f.type
            reader.id = count++
            reader.filename = f.name
            reader.readAsDataURL(f)

            if (files.length > 0) files.push(f)
        }

        if (files.length === 0) {
            for (f of el.files) files.push(f)
        }
        
        const dT = new DataTransfer();
        for (f of files) dT.items.add(f)
        el.files = dT.files
    })

    function removeItem(e) {
        let el = $(e.target).parents('.file-container')
        let name = el.data('name')
        el.remove()
        files = files.filter((i) => i.name !== name)

        const dT = new DataTransfer();
        for (f of files) dT.items.add(f)
        $('#postFile')[0].files = dT.files
    }


    function startNotifyTimer() {
        let tinInit = 3
        let c = tinInit
        setInterval(() => {
            if (c-- < 0) {
                if (tinInit < 120) tinInit = tinInit + 1          
                c = tinInit

                let id = parseInt($($('.item-img-sm')[0]).data('id'))
                if (!id || isNaN(id)) id = parseInt($($('.item-audio')[0]).data('id'))
                touchYoungFiles(id)
            }
        }, 1000)
    }
    let urlPath = location.pathname.split('/')[2]
    if (urlPath === 'pass') startNotifyTimer()
    
    function touchYoungFiles(id) {
        let board = location.pathname.split('/')[1]

        fetch(`${bridgePath}/${board}/touch?id=${id}`, {
            method: 'GET',
            headers: { 'Content-Type' : 'text/html; charset=utf-8' },
        })
        .then(async(res) => {
            if (res && res.status === 200) {
                let data = await res.text()
                if (data && data.length > 0) $('#frameContext').html(data)
            }
        })
    }
})