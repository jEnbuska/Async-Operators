/* eslint-disable consistent-return */
const { sleep, createResolvable, } = require('./utils');

function provider ({ index = 0, callback, params: { type, }, }) {
    return function createProvider ({ isActive, onNext, race, catcher, onComplete, }) {
        return {
            onComplete: async function providerOnComplete () {
                if (type === 'map') {
                    let out;
                    try {
                        out = callback();
                    } catch (e) {
                        catcher(e, { index, name, value: callback, });
                    }
                    await onNext(out, [ 0, ]);
                    return onComplete();
                } else if (type === 'callback') {
                    let i = 0;
                    const { resolve, promise, } = await createResolvable();
                    callback({
                        onNext: function callbackOnNext (value) {
                            if (isActive()) {
                                onNext(value, [ i++, ]);
                            }
                        },
                        onComplete: function callbackOnComplete () {
                            resolve();
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
                            catcher(e, { index, name: provider, value: generator, });
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

function filter ({ index, name = 'filter', params: { initFilter, }, }) {
    return function createFilter ({ isActive, onNext, catcher, }) {
        const predicate = initFilter();
        return {
            onNext: function invokeFilter (value, order) {
                if (isActive()) {
                    let accept;
                    try {
                        accept = predicate(value);
                    } catch (e) {
                        return catcher(e, { name, value, index, });
                    }
                    if (accept) {
                        return onNext(value, order);
                    }
                }
            },
        };
    };
}

function endReducer ({ callback, index, name, params: { defaultValue, }, }) {
    return async function createEndReducer ({ onNext, catcher, extendRace, onComplete, }) {
        let output = defaultValue;
        function resetToInitialState () {
            output = defaultValue;
        }
        const { isActive, retire, ...rest } = await extendRace();
        return {
            ...rest,
            retire,
            isActive,
            onNext: function invokeEndReducer (value) {
                if (isActive()) {
                    let out;
                    try {
                        out = callback(value);
                    } catch (e) {
                        return catcher(e, { value, index, name, });
                    }
                    output = out.value;
                    if (out.done) {
                        retire();
                    }
                }
            },
            onComplete: function resolveEndReducer () {
                onNext(output, [ 0, ]);
                return onComplete().then(resetToInitialState);
            },
        };
    };
}

function latest ({ index, callback, name='latest', }) {
    return function createLatest ({ isActive, onNext, race, catcher, onComplete, }) {
        let futures = [];
        function resetToInitialState () {
            futures = [];
        }
        return {
            onComplete: function latestOnComplete () {
                if (isActive()) {
                    return race(Promise.all(futures.map(e => e.task()))).then(() => onComplete().then(resetToInitialState));
                } else {
                    return onComplete().then(resetToInitialState);
                }
            },
            onNext: function invokeOnNext (value, order) {
                if (isActive()) {
                    try {
                        futures = callback(value, futures);
                    } catch (e) {
                        return catcher(e, { value, index, name, });
                    }
                    futures.push({ value, task () {
                        return onNext(value, order);
                    }, });
                }
            },
        };
    };
}
function ordered ({ callback, index, name = 'ordered', }) {
    return async function createOrdered ({ onNext, isActive, onComplete, race, catcher, }) {
        let futures = {};
        function resetToInitialState () {
            futures = {};
        }
        return {
            onNext: function invokeOrdered (value, order) {
                if (isActive()) {
                    futures[order] = {
                        val: value,
                        task () {
                            onNext(value, order);
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
                return onComplete().then(resetToInitialState);
            },
        };
    };
}

function $default ({ params: { defaultValue, }, }) {
    return function createDefault ({ onNext, onComplete, isActive, catcher, }) {
        let isSet = false;
        function resetToInitialState () {
            isSet = false;
        }
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
                return onComplete().then(resetToInitialState);
            },
        };
    };
}

function parallel ({ index, params: { limit, }, }) {
    return async function createParallel ({ onNext, isActive, onComplete, race, catcher,  }) {
        let completeLater = [];
        let parallelCount = 0; // TODO add err handling
        let index = 0;
        function resetToInitialState () {
            completeLater = [];
            parallelCount = 0; // TODO add err handling
            index = 0;
        }
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
                return Promise.all([ ...pending, completeRest(), ]).then(() => onComplete().then(resetToInitialState));
            },
        };
    };
}

function repeat ({ callback, name, index, params: { limit = 0, }, }) {
    return async function createRepeat ({ onNext, isActive, onComplete, race, catcher,  }) {
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
                repeats = 0;
                return result;
            },
        };
    };
}
function delay ({ index, params: { getDelay, }, }) {
    return function createDelay ({ onComplete, isActive, onNext, race, catcher,  }) {
        let delays = [];
        function resetToInitialState () {
            delays = [];
        }
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
                return Promise.all(delays).then(() => onComplete().then(resetToInitialState));
            },
        };
    };
}

function $await ({ index, }) {
    return function createAwait ({ onNext, isActive, race, onComplete, catcher, }) {
        let promises = [];
        function resetToInitialState () {
            promises = [];
        }
        function applyAwait (value, order) {
            const promise = race(value).then(value => isActive() && onNext(value, order));
            promises.push(promise);
            return promise;
        }
        return {
            onNext: function awaitOnNext (value, order) {
                if (isActive()) {
                    return applyAwait(value, order);
                }
            },
            onComplete: function awaitOnComplete () {
                const toBeResolved = promises;
                promises = [];
                return Promise.all(toBeResolved).then(() => onComplete().then(resetToInitialState));
            },
        };
    };
}

function forEach ({ callback, index, }) {
    return function createForEach ({ catcher, onNext, isActive, }) {
        return {
            onNext: function forEachOnNext (value, order) {
                if (isActive()) {
                    try {
                        callback(value);
                    } catch (e) {
                        return catcher(e, { index, name: 'forEach', value, });
                    }
                    return onNext(value, order);
                }
            },
        };
    };
}

function map ({ name = 'map', index, params: { createCallback, }, }) {
    return function createMap ({ onNext, isActive, catcher,  }) {
        const callback = createCallback();
        return {
            onNext: function mapOnNext (value, order) {
                if (isActive()) {
                    let out;
                    try {
                        out = callback(value);
                    } catch (e) {
                        return catcher(e, { index, name, value, });
                    }
                    return onNext(out, order);
                }
            },
        };
    };
}
function generator ({ callback, name = 'generator', index, }) {
    return function createGenerator ({ onNext, onComplete, race, isActive, catcher,  }) {
        let toBeResolved = [];
        function resetToInitialState () {
            toBeResolved = [];
        }
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
                    catcher(e, { value: gen, index, name, });
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
                return Promise.all(toBeResolved).then(() => onComplete().then(resetToInitialState));
            },
        };
    };
}
function reducer ({ name, index, params: { initReducer, }, }) {
    return function createReducer ({ isActive, onNext, onComplete, catcher,  }) {
        const { reduce, defaultValue, } = initReducer();
        let acc = defaultValue;
        function resetToInitialState () {
            acc = defaultValue;
        }
        return {
            onNext: function reduceOnNext (value) {
                if (isActive()) {
                    try {
                        acc = reduce(acc, value);
                    } catch (e) {
                        return catcher(e, { index, name, value, });
                    }
                }
            },
            onComplete: function reduceOnComplete () {
                if (isActive()) onNext(acc, [ 0, ]);
                return onComplete().then(resetToInitialState);
            },
        };
    };
}
function postUpstreamFilter ({ name, index, params: { createCallback, }, }) {
    return async function createPostUpstreamFilter ({ onNext, catcher, extendRace, }) {
        const callback = createCallback();
        const { isActive, retire, ...rest } = await extendRace();
                // TODO how to reset postlimiter?
        return {
            ...rest, isActive, retire,
            onNext: function postUptreamFilterOnNext (value, order) {
                if (isActive()) {
                    const res = onNext(value, order);
                    let stop;
                    try {
                        stop= callback(value);
                    } catch (e) {
                        return catcher(e, { value, index, name, });
                    }
                    if (stop) {
                        retire();
                    } else {
                        return res;
                    }
                }
            },
        };
    };
}

function preUpStreamFilter ({ index, name, params: { createCallback, }, }) {
    return async function createPreUpStreamFilter ({ onNext, extendRace, catcher, }) {
        const callback = createCallback();
        const { isActive, retire, ...rest } = await extendRace(); // TODO how to reset pre upstream limiter?
        return {
            ...rest,
            retire,
            isActive,
            onNext: function preUpStreamFilterOnNext (value, order) {
                if (isActive()) {
                    let accept;
                    try {
                        accept = callback(value);
                    } catch (e) {
                        return catcher(e, { value, index, name, });
                    }
                    if (accept) {
                        return onNext(value, order);
                    } else {
                        retire();
                    }
                }
            },
        };
    };
}

function $catch ({ callback, index, }) {
    return function createCatch ({ catcher, }) {
        return {
            catcher: function onCatch (error, { name, value, index: subjectIndex, continuousError= [], }) {
                const debugFriendlyInfo = { name, value: value === undefined ? '$undefined': value, index: subjectIndex, continuousError, };
                try {
                    callback(error, debugFriendlyInfo);
                } catch (e) {
                    continuousError.push({ value: e, index, name: 'catch', });
                    catcher(e, debugFriendlyInfo);
                }
            },
        };
    };
}
module.exports = {
    $catch,
    $default,
    $await,
    forEach,
    parallel,
    delay,
    reduce: reducer,
    map,
    postUpstreamFilter,
    preUpStreamFilter,
    generator,
    filter,
    ordered,
    endReducer,
    provider,
    repeat,
    latest,
};
