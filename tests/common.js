
function sleep (time) {
    return new Promise(res => setTimeout(res, time));
}
function sleepAndReturn (time, result = time) {
    return new Promise(res => setTimeout(() => {
        res(result);
    }, time));
}

function createDuration () {
    const before= Date.now();
    let invoke = 0;
    return function getDuration () {
        return { time: Date.now()-before, invoke: ++invoke, };
    };
}
module.exports = {
    sleepAndReturn,
    sleep,
    createDuration,
};
