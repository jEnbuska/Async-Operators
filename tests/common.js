
async function sleepAndReturn (time, result) {
    return new Promise(res => setTimeout(() => {
        res(result);
    }, time));
}

module.exports = {
    sleepAndReturn
};
