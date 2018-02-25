/* eslint-disable consistent-return */
const { createResolvable, sleep, } = require('./utils');

function filter ({ middlewareIndex, name = 'filter', params: { createFilter, }, }) {
    return function createFilterUpStream () {
        return {
            createDownStream: function createFilterDownStream ({ isActive, onNext, catcher, }) {
                const predicate = createFilter();
                return {
                    onNext: function invokeFilter (val, keep, order) {
                        if (isActive()) {
                            if (predicate(val, keep)) {
                                return onNext(val, keep, order);
                            }
                        }
                    },
                };
            },
        };
    };
}

function endResolver ({ callback, middlewareIndex, name, params: { defaultValue, }, }) {
    return function createEndResolverUpStream () {
        return {
            createDownStream: async function createEndResolverDownStream ({ onNext, catcher, extendRace, onComplete, }) {
                let output = defaultValue;
                const { isActive, retire, ...rest } = await extendRace();
                return {
                    ...rest,
                    retire,
                    isActive,
                    onComplete: function resolveSome () {
                        onNext(output, {}, [ 0, ]);
                        return onComplete();
                    },
                    onNext: function invokeSome (val, keep) {
                        if (isActive()) {
                            const { value, done, } = callback(val, keep);
                            output = value;
                            if (done) {
                                retire();
                            }
                        }
                    },
                };
            },
        };
    };
}
function ordered ({ callback, middlewareIndex, name = 'ordered', }) {
    return function createOrderedUpStream ({ }) {
        return {
            createDownStream: async function createOrderedDownStream ({ onNext, isActive, onComplete, race, catcher, }) {
                let futures = {};
                const {} = await createResolvable();
                return {
                    onComplete: function orderedResolver () {
                        const runnables = Object.entries(futures).sort(callback).map((e) => e[1].task);
                        let index = 0;
                        return (function orderedResolver () {
                            if (runnables[index] && isActive()) {
                                return race(runnables[index++]()).then(orderedResolver);
                            }
                        })().then(onComplete);
                    },
                    onNext: function invokeOrdered (val, keep, order) {
                        if (isActive()) {
                            futures[order] = {
                                val,
                                task () {
                                    onNext(val, keep, order);
                                },
                            };
                        }
                    },
                };
            },
        };
    };
}
function keep ({ callback, }) {
    return function createKeepUpStream () {
        return {
            createDownStream: function createKeepDownStream ({ isActive, onNext, catcher,  }) {
                return {
                    onNext: function invokeKeep (val, keep, order) {
                        if (isActive) {
                            const out = callback(val, keep);
                            return onNext(val, { ...keep, ...out, }, order);
                        }
                    },
                };
            },
        };
    };
}

function $default ({ params: { defaultValue, }, }) {
    return function createDefaultUpStream () {
        return {
            createDownStream: function createDefaultDownStream ({ onNext, onComplete, isActive, catcher, }) {
                let isSet = false;
                return {
                    onComplete: function completeDefault () {
                        if (isSet) {
                            isSet = false;
                        } else if (isActive()) {
                            onNext(defaultValue, {}, [ 0, ]);
                        }
                        return onComplete();
                    },
                    onNext: function invokeDefault (val, keep, order) {
                        if (isActive()) {
                            isSet = true;
                            return onNext(val, keep, order);
                        }
                    },
                };
            },
        };
    };
}

function peek ({ callback, }) {
    return function createPeekUpStream () {
        return {
            createDownStream: function createPeekDownStream ({ onNext, isActive, catcher,  }) {
                return {
                    onNext: function invokePeek (val, keep, order) {
                        if (isActive()) {
                            callback(val, keep);
                            return onNext(val, keep, order);
                        }
                    },
                };
            },
        };
    };
}

function parallel ({ middlewareIndex, params: { limit, }, }) {
    return async function createParallelUpStream () {
        return {
            createDownStream: async function createParallelDownStream ({ onNext, isActive, onComplete, race, catcher,  }) {
                const completeLater = [];
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
                    onComplete: function completeParallel () {
                        return Promise.all([ ...pending, ...completeRest(), ]).then(onComplete);
                    },
                    onNext: function invokeParallel (val, keep, order) {
                        if (isActive()) {
                            completeLater.push(async () => onNext(val, keep, order));
                            if (parallelCount!==limit) {
                                pending.push(completeRest());
                                return pending[pending.length-1];
                            }
                        }
                    },
                };
            },
        };
    };
}

function delay ({ middlewareIndex, params: { getDelay, }, }) {
    return function createDelayUpStream () {
        return {
            createDownStream: function createDelayDownStream ({ onComplete, isActive, onNext, race, catcher,  }) {
                const delays = [];
                async function createDelay (val, keep, order) {
                    await race(sleep(getDelay(val, keep)));
                    if (isActive()) {
                        return onNext(val, keep, order);
                    }
                }
                return {
                    onComplete: function completeDelay () {
                        return Promise.all(delays).then(onComplete);
                    },
                    onNext: function invokeDelay (val, keep, order) {
                        if (isActive()) {
                            delays.push(createDelay(val, keep, order));
                            return delays[delays.length-1];
                        }
                    },
                };
            },
        };
    };
}

function $await ({ middlewareIndex, }) {
    return function createAwaitUpStream () {
        return {
            createDownStream: function createAwaitDownStream ({ onNext, isActive, race, onComplete, catcher, }) {
                let promises = [];
                function applyAwait (val, keep, order) {
                    const promise = race(val).then(val => isActive() && onNext(val, keep, order));
                    promises.push(promise);
                    return promise;
                }
                return {
                    onComplete: function completeAwait () {
                        const toBeResolved = promises;
                        promises = [];
                        return Promise.all(toBeResolved).then(onComplete);
                    },
                    onNext: function invokeAwait (val, keep, order) {
                        if (isActive()) {
                            return applyAwait(val, keep, order);
                        }
                    },
                };
            },
        };
    };
}

function forEach ({ callback, middlewareIndex, }) {
    return function createForEachUpStream ({ }) {
        return {
            createDownStream: function createForEachDownStream ({ catcher, onNext, isActive, }) {
                return {
                    onNext: function invokeForEach (val, keep, order) {
                        if (isActive()) {
                            callback(val, keep);
                            return onNext(val, keep, order);
                        }
                    },
                };
            },
        };
    };
}

function map ({ name = 'map', middlewareIndex, params: { createCallback, }, }) {
    return function createMapUpStream () {
        const callback = createCallback();
        return {
            createDownStream: function createMapDownStream ({ onNext, isActive, catcher,  }) {
                return {
                    onNext: function invokeMap (val, keep, order) {
                        if (isActive()) {
                            const out = callback(val, keep);
                            return onNext(out, keep, order);
                        }
                    },
                };
            },
        };
    };
}
function generator ({ callback, name = 'generator', middlewareIndex, }) {
    return function createGeneratorUpStream () {
        let toBeResolved = [];
        return {
            createDownStream: function createGeneratorDownStream ({ onNext, onComplete, race, isActive, catcher,  }) {
                let completeCallback;
                async function generatorResolver (val, keep, order = []) {
                    let gen;
                    gen = await callback(val, keep);
                    if (!gen.next) {
                        return onNext(gen, keep, order);
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
                                    promises.push(onNext(result.value, keep, [ ...order, i++, ]));
                                    if (isActive()) continue;
                                }
                            }
                        }
                        break;
                    }
                }
                if (!middlewareIndex) { // first
                    completeCallback = function completeGenerator () {
                        return generatorResolver(undefined, {}, [ 0, ]).then(onComplete);
                    };
                } else {
                    completeCallback = function completeGenerator () {
                        return Promise.all(toBeResolved).then(onComplete);
                    };
                }
                return {
                    onComplete: completeCallback,
                    onNext: function invokeGenerator (val, keep, order) {
                        if (isActive()) {
                            toBeResolved.push(generatorResolver(val, keep, order));
                            return toBeResolved[toBeResolved.length-1];
                        }
                    },
                };
            },
        };
    };
}
function reduce ({ name, middlewareIndex, params: { createReducer, }, }) {
    return function createReducerUpStream ({ }) {
        return {
            createDownStream: function createrReducerDownStream ({ isActive, onNext, onComplete, catcher,  }) {
                const { reduce, defaultValue, } = createReducer();
                let acc = defaultValue;
                return {
                    onComplete: function completeToArray () {
                        if (isActive()) onNext(acc, {}, [ 0, ]);
                        return onComplete();
                    },
                    onNext: function invokeToArray (val, keep, order) {
                        if (isActive()) {
                            return acc = reduce(acc, val, keep);
                        }
                    },
                };
            },
        };
    };
}
function postLimiter ({ name, middlewareIndex, params: { createCallback, }, }) {
    return function createPostLimiterUpStream () {
        const callback = createCallback();
        return {
            createDownStream: async function createPostLimiterDownStream ({ onNext, catcher, extendRace, }) {
                const { isActive, retire, ...rest } = await extendRace();
                return {
                    ...rest, isActive, retire,
                    onNext: function invokePostLimiter (val, keep, order) {
                        if (isActive()) {
                            const res = onNext(val, keep, order);
                            if (callback(val, keep)) {
                                retire();
                            } else {
                                return res;
                            }
                        }
                    },
                };
            },
        };
    };
}

function preLimiter ({ middlewareIndex, name, params: { createCallback, }, }) {
    return async function createPreLimiterUpStream () {
        const callback = createCallback();
        return {
            createDownStream: async function createPreLimiterDownStream ({ onNext, extendRace, catcher, }) {
                const { isActive, retire, ...rest } = await extendRace();
                return {
                    ...rest,
                    retire,
                    isActive,
                    onNext: function invokePreLimiter (val, keep, order) {
                        if (isActive()) {
                            if (callback(val, keep)) {
                                return onNext(val, keep, order);
                            } else {
                                retire();
                            }
                        }
                    },
                };
            },
        };
    };
}
module.exports = {
    keep,
    peek,
    forEach,
    parallel,
    $default,
    $await,
    delay,
    reduce,
    map,
    postLimiter,
    preLimiter,
    generator,
    filter,
    ordered,
    endResolver,
};
