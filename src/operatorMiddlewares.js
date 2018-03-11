/* eslint-disable consistent-return */
const { createResolvable, } = require('./utils');

function prepareProvider ({ index = 0, callback, params: { type, }, }) {
    return function createProvider ({ isActive, onNext, race, onError, onComplete, }) {
        return {
            onComplete: async function providerOnComplete () {
                if (type === 'map') {
                    let out;
                    try {
                        out = callback();
                    } catch (e) {
                        onError(e, { index, name, value: callback, });
                    }
                    await onNext(out, [ 0, ]);
                    return onComplete();
                } else if (type === 'callback') {
                    let i = 0;
                    const { resolve, promise, } = await createResolvable();
                    const toBeResolved = [];
                    callback({
                        race,
                        isActive,
                        onNext: function callbackOnNext (value) {
                            if (isActive()) {
                                const next = onNext(value, [ i++, ]);
                                toBeResolved.push(next);
                                return next;
                            }
                        },
                        onComplete: function callbackOnComplete () {
                            return race(Promise.all(toBeResolved)).then(resolve);
                        },
                    });
                    return promise.then(onComplete);
                } else if (type === 'generator') {
                    let generator = await callback();
                    let i = 0;
                    const promises = [];
                    let result = {};
                    while (true) {
                        try {
                            result= await race(generator.next(result.value));
                        } catch (e) {
                            onError(e, { index, name: prepareProvider, value: generator, });
                            continue;
                        }
                        if (result) {
                            if (isActive()) {
                                if (!result.done) {
                                    promises.push(onNext(result.value, [ i++, ]));
                                    if (isActive()) continue;
                                }
                            }
                        }
                        return Promise.all(promises).then(onComplete);
                    }
                }
            },
        };
    };
}

function prepareEndReduce ({ callback, index, name, params: { defaultValue, }, }) {
    return async function createEndReduce ({ onNext, onError, extendRace, onComplete, }) {
        let output = defaultValue;
        const { isActive, retire, race, ...rest } = await extendRace();
        return {
            ...rest,
            race,
            retire,
            isActive,
            onNext: function invokeEndReduce (value) {
                if (isActive()) {
                    let out;
                    try {
                        out = callback(value);
                    } catch (e) {
                        return onError(e, { value, index, name, });
                    }
                    output = out.value;
                    if (out.done) {
                        retire();
                    }
                }
            },
            onComplete: async function resolveEndReduce () {
                return race(onNext(output, [ 0, ])).then(onComplete);
            },
        };
    };
}

// Name conflicts with Emitter middleware
function prepareLatest ({ index, callback, name='latest', }) {
    return function createLatest ({ isActive, onNext, race, onError, onComplete, }) {
        let futures = [];
        return {
            onComplete: function latestOnComplete () {
                if (isActive()) {
                    return race(Promise.all(futures.map(e => e.task()))).then(onComplete);
                } else {
                    return onComplete();
                }
            },
            onNext: function invokeOnNext (value, order) {
                if (isActive()) {
                    try {
                        futures = callback(value, futures);
                    } catch (e) {
                        return onError(e, { value, index, name, });
                    }
                    futures.push({ value, task () {
                        return onNext(value, order);
                    }, });
                }
            },
        };
    };
}

function prepareOrdered ({ callback, index, name = 'ordered', }) {
    return async function createOrdered ({ onNext, isActive, onComplete, race, onError, }) {
        let futures = {};
        return {
            onNext: function invokeOrdered (value, order) {
                if (isActive()) {
                    futures[order] = {
                        val: value,
                        task () {
                            if (isActive()) {
                                return onNext(value, order);
                            }
                        },
                    };
                }
            },
            onComplete: async function orderedOnComplete () {
                const runnables = Object.entries(futures).sort(callback).map((e) => e[1].task);
                let index = 0;
                while (runnables.length>index && isActive()) {
                    await race(runnables[index++]());
                }
                return onComplete();
            },
        };
    };
}

function prepareDefault ({ params: { defaultValue, }, }) {
    return function createDefault ({ onNext, onComplete, isActive, onError, }) {
        let isSet = false;
        return {
            onNext: function defaultOnNext (value, order) {
                if (isActive()) {
                    isSet = true;
                    return onNext(value, order);
                }
            },
            onComplete: function defaultOnComplete () {
                if (!isSet && isActive()) {
                    onNext(defaultValue, [ 0, ]);
                }
                return onComplete();
            },
        };
    };
}
function prepareRepeat ({ callback, name, index, params: { limit = 0, }, }) {
    return async function createRepeat ({ onNext, isActive, onComplete, race, onError,  }) {
        let tasks = [];
        return {
            onNext: function repeatOnNext (value, order) {
                if (isActive()) {
                    tasks.push(() => onNext(value, order));
                    return tasks[tasks.length-1]();
                }
            },
            onComplete: async function repeatOnComplete () {
                let result;
                let repeats = 0;
                while (!limit || limit>repeats++) {
                    result = await race(onComplete());
                    if (isActive()) {
                        const shouldRepeat = await callback();
                        if (shouldRepeat) {
                            await Promise.all(tasks.map(task => task()));
                            continue;
                        }
                    }
                    break;
                }
                return result;
            },
        };
    };
}
function prepareReduce ({ name, index, callback, params: { acc, }, }) {
    return function createReducer ({ isActive, onNext, onComplete, onError,  }) {
        return {
            onNext: function reduceOnNext (value, order, scope) {
                if (isActive()) {
                    try {
                        acc = callback(acc, value, scope);
                    } catch (e) {
                        return onError(e, { index, name, value, });
                    }
                }
            },
            onComplete: function reduceOnComplete () {
                if (isActive()) onNext(acc, [ 0, ]);
                return onComplete();
            },
        };
    };
}
module.exports = {
    prepareProvider,
    prepareLatest,
    prepareEndReduce,
    prepareDefault,
    prepareOrdered,
    prepareRepeat,
    prepareReduce,
};
