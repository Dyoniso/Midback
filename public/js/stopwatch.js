let output = $('#stopwatch')
let ms = 100;
let sec = output.text().split('/').pop();
let min = output.text().split('/')[0];

function timer() {
    ms--;
    if(ms <= 0){
        sec--
        ms = 100
    }
    if(sec <= 0){
        min--
        sec = 60
    }

    if (min <= 0) {
        document.cookie = 'V-Passport=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'I-Passport=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        location.href = '/'
        stop()
    }

    //Doing some string interpolation
    let milli = ms < 10 ? `0`+ ms : ms;
    let seconds = sec < 10 ? `0`+ sec : sec;
    let minute = min < 10 ? `0` + min : min;

    output.stop(true,true).text(`${minute}:${seconds}:${milli}`)
}

//Start timer
if (min > 0) {
    setInterval(timer, 10)   
}

//stop timer
function stop() {
    clearInterval(time)
}