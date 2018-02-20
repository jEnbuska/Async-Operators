
function sleep (time) {
    return new Promise(res => setTimeout(res, time));
}
function sleepAndReturn (time, result) {
    return new Promise(res => setTimeout(() => {
        res(result);
    }, time));
}
module.exports = {
    sleepAndReturn,
    sleep,
};
