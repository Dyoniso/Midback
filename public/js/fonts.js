let bdgePath = $('#bdgePath').val()
$('#fontStyle').html(`
    @font-face {
        font-family: 'halloween';
        src: url('${bdgePath}/css/fonts/font_halloween.ttf')  format('truetype');
        
    }
    @font-face {
        font-family: 'boulder';
        src: url('${bdgePath}/css/fonts/font_boulder.ttf');   
    }
`)