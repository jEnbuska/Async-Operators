/* eslint-disable consistent-return */
const { sleep, } = require('./utils');

// Ok for emitter
function prepareParallel ({ index, params: { limit, }, }) {
    return async function createParallel ({ onNext, isActive, onComplete, race, onError,  }) {
        let completeLater = [];
        let parallelCount = 0; // TODO add err handling
        let index = 0;
        function decrementParallelCount () {
            parallelCount--;
        }
        const pending = [];
        function completeRest () {
            const to = index + (limit ? limit-parallelCount : completeLater.length);
            const resoleNow = [];
            while (index<to && completeLater[index] && isActive()) {
                resoleNow.push(completeLater[index++]);
            }
            parallelCount+=resoleNow.length;
            return race(Promise.all(resoleNow.map(promise => race(promise()).then(decrementParallelCount).then(completeRest))));
        }
        return {
            onNext: function parallelOnNext (value, order) {
                if (isActive()) {
                    completeLater.push(async () => onNext(value, order));
                    if (parallelCount!==limit) {
                        pending.push(completeRest());
                        return pending[pending.length-1];
                    }
                }
            },
            onComplete: function parallelOnComplete () {
                return Promise.all([ ...pending, completeRest(), ]).then(onComplete);
            },
        };
    };
}

// Ok for emitter
function prepareDelay ({ index, params: { getDelay, }, }) {
    return function createDelay ({ onComplete, isActive, onNext, race, onError,  }) {
        let delays = [];
        async function createDelay (value, order) {
            await race(sleep(getDelay(value)));
            if (isActive()) {
                return onNext(value, order);
            }
        }
        return {
            onNext: function delayOnNext (value, order) {
                if (isActive()) {
                    delays.push(createDelay(value, order));
                    return delays[delays.length-1];
                }
            },
            onComplete: function delayOnComplete () {
                return Promise.all(delays).then(onComplete);
            },
        };
    };
}

// Ok for emitter
function prepareAwait ({ index, }) {
    return function createAwait ({ onNext, isActive, race, onComplete, onError, }) {
        const promises = [];
        async function applyAwait (value, order) {
            let result;
            try {
                result = await value;
            } catch (e) {
                return onError(e, { value, index, name: 'await', });
            }
            onNext(result, order);
        }
        return {
            onNext: function awaitOnNext (value, order) {
                if (isActive()) {
                    const promise = race(applyAwait(value, order));
                    promises.push(promise);
                    return promise;
                }
            },
            onComplete: function awaitOnComplete () {
                return Promise.all(promises).then(onComplete);
            },
        };
    };
}

// Ok for emitter
function prepareGenerator ({ callback, name = 'generator', index, }) {
    return function createGenerator ({ onNext, onComplete, race, isActive, onError,  }) {
        const toBeResolved = [];
        async function generatorResolver (value, order = []) {
            let gen;
            gen = await callback(value);
            if (!gen.next) {
                return onNext(gen, order);
            }
            let result = {};
            let i = 0;
            const promises = [];
            while (isActive()) {
                try {
                    result = await race(gen.next(result.value));
                } catch (e) {
                    onError(e, { value: gen, index, name, });
                    continue;
                }
                if (result && isActive()) {
                    if (result.done) return Promise.all(promises);
                    else {
                        promises.push(onNext(result.value, [ ...order, i++, ]));
                        if (isActive()) continue;
                    }
                }
                break;
            }
        }
        return {
            onNext: function generatorOnNext (value, order) {
                if (isActive()) {
                    toBeResolved.push(generatorResolver(value, order));
                    return toBeResolved[toBeResolved.length-1];
                }
            },
            onComplete: function generatorOnComplete () {
                return Promise.all(toBeResolved).then(onComplete);
            },
        };
    };
}

module.exports = {
    prepareAwait,
    prepareParallel,
    prepareDelay,
    prepareGenerator,
};
