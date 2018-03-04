/* eslint-disable consistent-return */
const { sleep, } = require('./utils');

function provider ({ middlewareIndex = 0, name='provider', callback, params: { type, }, }) {
    return function createProvider ({ isActive, onNext, race, catcher, onComplete, }) {
        return {
            async onComplete () {
                if (type === 'map') {
                    await onNext(callback(), [ 0, ]);
                    return onComplete();
                } else if (type === 'generator') {
                    let generator = await callback();
                    let result = {};
                    let i = 0;
                    const promises = [];
                    while (true) {
                        result = await race(generator.next(result.value));
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

function filter ({ middlewareIndex, name = 'filter', params: { initFilter, }, }) {
    return function createFilter ({ isActive, onNext, catcher, }) {
        const predicate = initFilter();
        return {
            onNext: function invokeFilter (val, order) {
                if (isActive()) {
                    if (predicate(val)) {
                        return onNext(val, order);
                    }
                }
            },
        };
    };
}

function endReducer ({ callback, middlewareIndex, name, params: { defaultValue, }, }) {
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
            onNext: function invokeEndReducer (val) {
                if (isActive()) {
                    const { value, done, } = callback(val);
                    output = value;
                    if (done) {
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
function ordered ({ callback, middlewareIndex, name = 'ordered', }) {
    return async function createOrdered ({ onNext, isActive, onComplete, race, catcher, }) {
        let futures = {};
        function resetToInitialState () {
            futures = {};
        }
        return {
            onNext: function invokeOrdered (val, order) {
                if (isActive()) {
                    futures[order] = {
                        val,
                        task () {
                            onNext(val, order);
                        },
                    };
                }
            },
            onComplete: function orderedOnComplete () {
                const runnables = Object.entries(futures).sort(callback).map((e) => e[1].task);
                let index = 0;
                return (function orderedResolver () {
                    if (runnables[index] && isActive()) {
                        return race(runnables[index++]()).then(orderedResolver);
                    }
                })().then(() => onComplete().then(resetToInitialState));
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
            onNext: function defaultOnNext (val, order) {
                if (isActive()) {
                    isSet = true;
                    return onNext(val, order);
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

function parallel ({ middlewareIndex, params: { limit, }, }) {
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
            onNext: function parallelOnNext (val, order) {
                if (isActive()) {
                    completeLater.push(async () => onNext(val, order));
                    if (parallelCount!==limit) {
                        pending.push(completeRest());
                        return pending[pending.length-1];
                    }
                }
            },
            onComplete: function parallelOnComplete () {
                return Promise.all([ ...pending, ...completeRest(), ]).then(() => onComplete().then(resetToInitialState));
            },
        };
    };
}

function repeat ({ callback, name, middlewareIndex, params: { limit = 0, }, }) {
    return async function createRepeat({ onNext, isActive, onComplete, race, catcher,  }) {
        let tasks = [];
        return {
            onNext: function repeatOnNext (val, order) {
                if (isActive()) {
                    tasks.push(() => onNext(val, order));
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
function delay ({ middlewareIndex, params: { getDelay, }, }) {
    return function createDelay ({ onComplete, isActive, onNext, race, catcher,  }) {
        let delays = [];
        function resetToInitialState () {
            delays = [];
        }
        async function createDelay (val, order) {
            await race(sleep(getDelay(val)));
            if (isActive()) {
                return onNext(val, order);
            }
        }
        return {
            onNext: function delayOnNext (val, order) {
                if (isActive()) {
                    delays.push(createDelay(val, order));
                    return delays[delays.length-1];
                }
            },
            onComplete: function delayOnComplete () {
                return Promise.all(delays).then(() => onComplete().then(resetToInitialState));
            },
        };
    };
}

function $await ({ middlewareIndex, }) {
    return function createAwait ({ onNext, isActive, race, onComplete, catcher, }) {
        let promises = [];
        function resetToInitialState () {
            promises = [];
        }
        function applyAwait (val, order) {
            const promise = race(val).then(val => isActive() && onNext(val, order));
            promises.push(promise);
            return promise;
        }
        return {
            onNext: function awaitOnNext (val, order) {
                if (isActive()) {
                    return applyAwait(val, order);
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

function forEach ({ callback, middlewareIndex, }) {
    return function createForEach ({ catcher, onNext, isActive, }) {
        return {
            onNext: function forEachOnNext (val, order) {
                if (isActive()) {
                    callback(val);
                    return onNext(val, order);
                }
            },
        };
    };
}

function map ({ name = 'map', middlewareIndex, params: { createCallback, }, }) {
    return function createMap ({ onNext, isActive, catcher,  }) {
        const callback = createCallback();
        return {
            onNext: function mapOnNext (val, order) {
                if (isActive()) {
                    const out = callback(val);
                    return onNext(out, order);
                }
            },
        };
    };
}
function generator ({ callback, name = 'generator', middlewareIndex, }) {
    return function createGenerator ({ onNext, onComplete, race, isActive, catcher,  }) {
        let toBeResolved = [];
        function resetToInitialState () {
            toBeResolved = [];
        }
        async function generatorResolver (val, order = []) {
            let gen;
            gen = await callback(val);
            if (!gen.next) {
                return onNext(gen, order);
            }
            let result = {};
            let i = 0;
            const promises = [];
            while (true) {
                result = await race(gen.next(result.value));
                if (result) {
                    if (isActive()) {
                        if (result.done) return Promise.all(promises);
                        else {
                            promises.push(onNext(result.value, [ ...order, i++, ]));
                            if (isActive()) continue;
                        }
                    }
                }
                break;
            }
        }
        return {
            onNext: function generatorOnNext (val, order) {
                if (isActive()) {
                    toBeResolved.push(generatorResolver(val, order));
                    return toBeResolved[toBeResolved.length-1];
                }
            },
            onComplete: function generatorOnComplete () {
                return Promise.all(toBeResolved).then(() => onComplete().then(resetToInitialState));
            },
        };
    };
}
function reducer ({ name, middlewareIndex, params: { initReducer, }, }) {
    return function createReducer ({ isActive, onNext, onComplete, catcher,  }) {
        const { reduce, defaultValue, } = initReducer();
        let acc = defaultValue;
        function resetToInitialState () {
            acc = defaultValue;
        }
        return {
            onNext: function reduceOnNext (val) {
                if (isActive()) {
                    return acc = reduce(acc, val);
                }
            },
            onComplete: function reduceOnComplete () {
                if (isActive()) onNext(acc, [ 0, ]);
                return onComplete().then(resetToInitialState);
            },
        };
    };
}
function postUpstreamFilter ({ name, middlewareIndex, params: { createCallback, }, }) {
    return async function createPostUpstreamFilter ({ onNext, catcher, extendRace, }) {
        const callback = createCallback();
        const { isActive, retire, ...rest } = await extendRace();
                // TODO how to reset postlimiter?
        return {
            ...rest, isActive, retire,
            onNext: function postUptreamFilterOnNext (val, order) {
                if (isActive()) {
                    const res = onNext(val, order);
                    if (callback(val)) {
                        retire();
                    } else {
                        return res;
                    }
                }
            },
        };
    };
}

function preUpStreamFilter ({ middlewareIndex, name, params: { createCallback, }, }) {
    return async function createPreUpStreamFilter ({ onNext, extendRace, catcher, }) {
        const callback = createCallback();
        const { isActive, retire, ...rest } = await extendRace(); // TODO how to reset pre upstream limiter?
        return {
            ...rest,
            retire,
            isActive,
            onNext: function preUpStreamFilterOnNext (val, order) {
                if (isActive()) {
                    if (callback(val)) {
                        return onNext(val, order);
                    } else {
                        retire();
                    }
                }
            },
        };
    };
}

function $catch ({ callback, middlewareIndex, name = 'catch', }) {
}
module.exports = {
    forEach,
    parallel,
    $default,
    $await,
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
};
