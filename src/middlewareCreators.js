/* eslint-disable consistent-return */
const { NOT_SET, createSet, createEmitter, orderComparator, entriesToObject, resolveOrdered, } = require('./utils');

function keep (callback) {
    return function createKeep ({ upStream, next, }) {
        return {
            next: function invokeKeep (val, keep, order) {
                if (upStream.call()) {
                    next(val, { ...keep, ...callback(val, keep), }, order);
                }
            },
        };
    };
}

function generator (producer, isSource) {
    return function createGenerator ({ next, upStream, resolve, }) {
        let toBeResolved = [];
        let resolveCallback;
        let nextCallback;
        let round = 0;
        let up = () => round === 0 && upStream.call();
        if (isSource) {
            nextCallback = next;
            resolveCallback = function resolveGenerator () {
                return createEmitter(producer, next, up, ).then(resolve);
            };
        } else {
            nextCallback = function invokeGenerator (val, keep, order) {
                if (upStream.call()) {
                    toBeResolved.push(createEmitter(producer, next, up, val, keep, order));
                }
            };
            resolveCallback = function resolveGenerator () {
                if (!upStream.call()) {
                    return resolve();
                }
                return Promise.all(toBeResolved).then(() => {
                    const current = round++;
                    up = () => current === round && upStream.call();
                    return resolve();
                });
            };
        }
        return {
            resolve: resolveCallback,
            next: nextCallback,
        };
    };
}

function first () {
    return function createFirst ({ resolve, upStream, next, }) {
        let value = NOT_SET;
        upStream = upStream.concat(() => value === NOT_SET);
        return {
            upStream,
            resolve: function resolveFirst () {
                const { val, keep = {}, }= value;
                value = NOT_SET;
                next(val, keep, {});
                return resolve();
            },
            next: function invokeFirst (val, keep) {
                if (upStream.call()) {
                    value = { val, keep, };
                }
            },
        };
    };
}

function default$ (defaultValue) {
    return function createDefault ({ next, resolve, upStream, }) {
        let isSet = false;
        return {
            resolve: function resolveDefault () {
                if (isSet) {
                    isSet = false;
                } else {
                    next(defaultValue, {});
                }
                return resolve();
            },
            next: function invokeDefault (val, keep, order) {
                if (upStream.call()) {
                    isSet = true;
                    next(val, keep, order);
                }
            },
        };
    };
}

function reverse () {
    return function createReverse ({ next, upStream, resolve, }) {
        let futures = [];
        return {
            resolve: function resolveReversed () {
                const runnables = futures.reverse();
                futures = [];
                return resolveOrdered(runnables, resolve);
            },
            next: function invokeReverse (val, keep, order) {
                if (upStream.call()) {
                    futures.push(() => next(val, keep, order));
                }
            },
        };
    };
}

function sort (comparator) {
    return function createSort ({ next, upStream, resolve, }) {
        let futures = [];
        const compare = function runComparison (a, b) {
            return comparator(a.val, b.val);
        };
        return {
            resolve: function resolveSort () {
                const runnables = futures.sort(compare).map(it => it.task);
                futures = [];
                return resolveOrdered(runnables, resolve);
            },
            next: function invokeReverse (val, keep, order) {
                if (upStream.call()) {
                    futures.push({ val, task: () => next(val, keep, order), });
                }
            },
        };
    };
}

function peek (callback) {
    return function createPeek ({ upStream, next, }) {
        return {
            next: function invokePeek (val, keep, order) {
                console.log(val);
                console.log(upStream.call());
                if (upStream.call()) {
                    callback(val, keep);
                    next(val, keep, order);
                }
            },
        };
    };
}

function toArray () {
    return function createToArray ({ upStream, next, resolve, }) {
        let acc = [];
        return {
            resolve: function resolveToArray () {
                next(acc, {}, [ 0, ]);
                console.log('resolve');
                acc = [];
                return resolve();
            },
            next: function invokeToArray (val) {
                if (upStream.call()) {
                    console.log('next');
                    console.log(val);
                    acc.push(val);
                }
            },
        };
    };
}

function toSet (picker) {
    return function createToArray ({ upStream, next, resolve, }) {
        let acc = new Set();
        return {
            resolve: function resolveToSet () {
                next(acc, {}, [ 0, ]);
                acc = new Set();
                return resolve();
            },
            next: function invokeToSet (val, keep) {
                if (upStream.call()) {
                    acc.add(picker(val, keep));
                }
            },
        };
    };
}

function toObject (picker) {
    return function createToObject ({ upStream, next, resolve, }) {
        let acc = {};
        return {
            resolve: function resolveToObject () {
                next(acc, {}, [ 0, ]);
                acc = {};
                return resolve();
            },
            next: function invokeToObject (val, keep) {
                if (upStream.call()) {
                    acc[picker(val, keep)] = val;
                }
            },
        };
    };
}

function toObjectSet (picker) {
    return function createToArray ({ upStream, next, resolve, }) {
        let acc = {};
        return {
            resolve: function resolveToObjectSet () {
                next(acc, {}, [ 0, ]);
                acc = {};
                return resolve();
            },
            next: function invokeToObjectSet (val, keep) {
                if (upStream.call()) {
                    acc[picker(val, keep)] = true;
                }
            },
        };
    };
}
function toMap (picker) {
    return function createToMap ({ upStream, next, resolve, }) {
        let acc = new Map();
        return {
            resolve: function resolveToMap () {
                next(acc, {}, [ 0, ]);
                acc = new Map();
                return resolve();
            },
            next: function invokeToObject (val, keep) {
                if (upStream.call()) {
                    acc.set(picker(val, keep), val);
                }
            },
        };
    };
}

function ordered () {
    return function createOrdered ({ next, upStream, resolve, }) {
        let futures = {};
        return {
            resolve: function orderedResolver () {
                const runnables = Object.entries(futures).sort((e1, e2) => orderComparator(e1[0], e2[0])).map((e) => e[1]);
                futures = {};
                return resolveOrdered(runnables, resolve);
            },
            next: function invokeOrdered (val, keep, order) {
                if (upStream.call()) {
                    futures[order] = () => next(val, keep, order);
                }
            },
        };
    };
}

function flatten (iterator) {
    return function createFlatten ({ next, upStream, }) {
        return {
            next: async function invokeFlatten (val, keep, order) {
                if (upStream.call()) {
                    const iterable = iterator(val, keep);
                    for (let i = 0; i<iterable.length; i++) {
                        next(iterable[i], keep, [ ...order, i, ]);
                    }
                }
            },
        };
    };
}

function map (mapper) {
    return function createMap ({ next, upStream, }) {
        return {
            next: function invokeMap (val, keep, order) {
                if (upStream.call()) {
                    next(mapper(val, keep), keep, order);
                }
            },
        };
    };
}

function parallel (limit) {
    return function createParallel ({ next, upStream, resolve, }) {
        const futures = [];
        let resolving = [];
        let upStreamTaskCount = 0;
        function onNext () {
            upStreamTaskCount--;
            while (futures.length) {
                const createTask = futures.shift();
                const task = createTask();
                if (task&& task.then) {
                    upStreamTaskCount++;
                    return task.then(onNext);
                }
                upStreamTaskCount--;
            }
        }
        return {
            resolve: function resolveParallel () {
                const upStreamTasks = resolving;
                resolving = [];
                return Promise.all(upStreamTasks).then(resolve);
            },
            next: function invokeParallel (val, keep, order) {
                if (upStream.call()) {
                    if (limit && limit<upStreamTaskCount) {
                        futures.push(() => {
                            const output = next(val, keep, order);
                            if (output && output.then) {
                                upStreamTaskCount++;
                                return output.then(onNext);
                            }
                        });
                    } else {
                        const result = next(val, keep, order);
                        if (result && result.then) {
                            upStreamTaskCount++;
                            resolving.push(result.then(onNext));
                        }
                    }
                }
            },
        };
    };
}

function pick (keys) {
    const keySet = createSet(keys);
    return function createPick ({ next, upStream, }) {
        return {
            next: function invokePick (val, keep, order) {
                if (upStream.call()) {
                    val = Object.entries(val)
                        .filter(e => keySet[e[0]])
                        .reduce(entriesToObject, {});
                    next(val, keep, order);
                }
            },
        };
    };
}

function distinctBy (historyComparator) {
    return function createDistinctBy ({ next, upStream, resolve, }) {
        let history = {};
        return {
            resolve: function resolveDistinctBy () {
                history = {};
                return resolve();
            },
            next: function invokeDistinctBy (val, keep, order) {
                if (upStream.call()) {
                    if (historyComparator(val, history, keep)) {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}
function distinct () {
    return function createDistinct ({ next, upStream, }) {
        let history = {};
        return {
            next: function invokeDistinct (val, keep, order) {
                if (upStream.call()) {
                    if (!history[val]) {
                        history[val] = true;
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}

function filter (predicate) {
    return function createFilter ({ upStream, next, }) {
        return {
            next: function invokeFilter (val, keep, order) {
                if (upStream.call()) {
                    if (predicate(val, keep)) {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}

function reject (predicate) {
    return function createReject ({ upStream, next, }) {
        return {
            next: function invokeReject (val, keep, order) {
                if (upStream.call()) {
                    if (!predicate(val, keep)) {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}

function omit (keys) {
    const rejectables = new Set(keys);
    return function createOmit ({ upStream, next, }) {
        return {
            next: function invokeOmit (val, keep, order) {
                if (upStream.call()) {
                    val = Object.entries(val).filter(e => !rejectables.has(e[0])).reduce(entriesToObject, {});
                    next(val, keep, order);
                }
            },
        };
    };
}

function where (matcher) {
    const matchEntries = Object.entries(matcher);
    return function createWhere ({ upStream, next,  }) {
        return {
            next: function invokeWhere (val, keep, order) {
                if (upStream.call()) {
                    for (const e of matchEntries) {
                        if (val[e[0]] !== e[1]) {
                            return;
                        }
                    }
                    next(val, keep, order);
                }
            },
        };
    };
}

function skipWhile (predicate) {
    return function createSkipWhile ({ upStream, next, resolve, }) {
        let take = false;
        return {
            resolve: function resolveSkipWhile () {
                take = false;
                return resolve();
            },
            next: function invokeSkipWhile (val, keep, order) {
                if (upStream.call()) {
                    if (take || (take = !predicate(val, keep))) {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}

function scan (scanner, acc) {
    return function createScan ({ resolve, upStream, next, }) {
        let output = acc;
        return {
            resolve: function resolveScan () {
                output = acc;
                return resolve();
            },
            next: async function invokeScan (val, keep, order) {
                if (upStream.call()) {
                    output = scanner(output, val, keep);
                    next(output, keep, order);
                }
            },
        };
    };
}

function takeUntil (predicate) {
    return function createTakeUntil ({ resolve, upStream, next, }) {
        let take = true;
        return {
            resolve: function resolveTakeUntil () {
                take = true;
                return resolve();
            },
            upStream: upStream.concat(() => take),
            next: function invokeTakeUntil (val, keep, order) {
                if (upStream.call() && take && (take = !predicate(val, keep))) {
                    next(val, keep, order);
                }
            },
        };
    };
}

function takeWhile (predicate) {
    return function createTakeWhile ({ resolve, upStream, next, }) {
        let take = true;
        return {
            upStream: upStream.concat(() => take),
            resolve: function resolveTakeWhile () {
                take = true;
                return resolve();
            },
            next: function invokeTakeWhile (val, keep, order) {
                if (take && (take = predicate(val, keep)) && upStream.call()) {
                    next(val, keep, order);
                }
            },
        };
    };
}

function skip (count) {
    count = Number(count) || 0;
    return function createSkip ({ upStream, next, }) {
        let total = 0;
        return {
            next: function invokeSkip (val, keep, order) {
                if (upStream.call()) {
                    if (total>=count) {
                        next(val, keep, order);
                    } else {
                        total++;
                    }
                }
            },
        };
    };
}
function take (max) {
    return function createTake ({ resolve, upStream, next, }) {
        max = Number(max) || 0;
        let taken = 0;
        return {
            upStream: upStream.concat(() => taken < max),
            resolve: function resolveTake () {
                taken = 0;
                return resolve();
            },
            next: function invokeTake (val, keep, order) {
                if (taken < max && upStream.call()) {
                    taken++;
                    next(val, keep, order);
                }
            },
        };
    };
}

function sum (summer) {
    return function createSum ({ next, upStream, resolve, }) {
        let total = 0;
        return {
            resolve: function resolveSum () {
                next(total, {}, [ 0, ]);
                total = 0;
                return resolve();
            },
            next: function invokeSum (val, keep) {
                if (upStream.call()) {
                    total += summer(val, keep);
                }
            },
        };
    };
}

function reduce (reducer, acc) {
    return function createReduce ({ next, upStream, resolve, }) {
        let output = acc;
        return {
            resolve: function resolveReduce () {
                next(output, {}, [ 0, ]);
                output = acc;
                return resolve();
            },
            next: function invokeReduce (val, keep) {
                if (upStream.call()) {
                    output = reducer(output, val, keep);
                }
            },
        };
    };
}

function some (predicate) {
    return function createSome ({ next, upStream, resolve, }) {
        let output = false;
        upStream = upStream.concat(() => !output);
        return {
            upStream,
            resolve: function resolveSome () {
                next(output, {}, [ 0, ]);
                output = false;
                return resolve();
            },
            next: function invokeSome (val, keep) {
                if (upStream.call()) {
                    output = predicate(val, keep);
                }
            },
        };
    };
}

function every (predicate) {
    return function createEvery ({ next, upStream, resolve,  }) {
        let output = true;
        upStream = upStream.concat(() => output);
        return {
            upStream,
            resolve: function resolveEvery () {
                next(output, {}, [ 0, ]);
                output = true;
                return resolve();
            },
            next: function invokeEvery (val, keep) {
                if (upStream.call()) {
                    output = !!predicate(val, keep);
                }
            },
        };
    };
}

function await$ () {
    return function createAwait ({ next, upStream, resolve, }) {
        let promises = [];
        async function applyAwait (val, keep, order) {
            val = await val;
            next(val, keep, order);
        }
        return {
            resolve: function resolveAwait  () {
                const toBeResolved = promises;
                promises = [];
                return Promise.all(toBeResolved).then(resolve);
            },
            next: function invokeAwait (val, keep, order) {
                if (upStream.call()) {
                    promises.push(applyAwait(val, keep, order));
                }
            },
        };
    };
}

function min (comparator) {
    return function createMin ({ next, upStream, resolve, }) {
        let min = NOT_SET;
        return {
            resolve: function resolveMin () {
                if (min !== NOT_SET) {
                    next(min, {}, [ 0, ]);
                    min = NOT_SET;
                }
                return resolve();
            },
            next: function invokeMin (val, keep) {
                if (upStream.call()) {
                    if (min!==NOT_SET) {
                        if (comparator(min, val, keep) > 0) {
                            min = val;
                        }
                    } else {
                        min = val;
                    }
                }
            },
        };
    };
}

function max (comparator) {
    return function createMin ({ next, upStream, resolve, }) {
        let max = NOT_SET;
        return {
            resolve: function resolveMax () {
                if (max !== NOT_SET) {
                    next(max, {}, [ 0, ]);
                    max = NOT_SET;
                }
                return resolve();
            },
            next: function invokeMax (val, keep) {
                if (upStream.call()) {
                    if (max!==NOT_SET) {
                        if (comparator(max, val, keep) < 0) {
                            max = val;
                        }
                    } else {
                        max= val;
                    }
                }
            },
        };
    };
}

function groupBy (callback) {
    return function createGroupBy ({ next, upStream, resolve, }) {
        let acc = {};
        return {
            resolve: function resolveGroupBy () {
                next(acc, {}, [ 0, ]);
                acc = {};
                return resolve();
            },
            next: function invokeGroupBy (val) {
                if (upStream.call()) {
                    callback(acc, val);
                }
            },
        };
    };
}

function forEach (callback) {
    return function createForEach () {
        return {
            next: function invokeForEach (val) {
                callback(val);
            },
        };
    };
}

module.exports = {
    keep,
    groupBy,
    first,
    reverse,
    sort,
    peek,
    toArray,
    toObject,
    toObjectSet,
    parallel,
    ordered,
    some,
    every,
    toSet,
    toMap,
    flatten,
    map,
    pick,
    distinct,
    distinctBy,
    filter,
    reject,
    omit,
    where,
    skipWhile,
    scan,
    takeWhile,
    takeUntil,
    skip,
    take,
    sum,
    reduce,
    min,
    max,
    default: default$,
    await: await$,
    generator,
    forEach,
};
