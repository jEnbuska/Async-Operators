/* eslint-disable consistent-return */
const { NOT_SET, createSet, createEmitter, orderComparator, entriesToObject, resolveOrdered, } = require('./utils');

function keep (callback) {
    return function createKeep ({ downStream, next, }) {
        return {
            next: function invokeKeep (val, keep, order) {
                if (downStream.call()) {
                    next(val, { ...keep, ...callback(val, keep), }, order);
                }
            },
        };
    };
}

function generator (producer, isSource) {
    return function createGenerator ({ next, downStream, resolve, }) {
        let toBeResolved = [];
        let resolveCallback;
        let nextCallback;
        let round = 0;
        let active = () => round === 0 && downStream.call();
        if (isSource) {
            nextCallback = next;
            resolveCallback = function resolveGenerator () {
                return createEmitter(producer, next, active, ).then(resolve);
            };
        } else {
            nextCallback = function invokeGenerator (val, keep, order) {
                if (downStream.call()) {
                    toBeResolved.push(createEmitter(producer, next, active, val, keep, order));
                }
            };
            resolveCallback = function resolveGenerator () {
                if (!downStream.call()) {
                    return resolve();
                }
                return Promise.all(toBeResolved).then(() => {
                    const current = round++;
                    active = () => current === round && downStream.call();
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
    return function createFirst ({ resolve, downStream, next, }) {
        let value = NOT_SET;
        downStream = downStream.concat(() => value === NOT_SET);
        return {
            downStream,
            resolve: function resolveFirst () {
                const { val, keep = {}, }= value;
                value = NOT_SET;
                next(val, keep, {});
                return resolve();
            },
            next: function invokeFirst (val, keep) {
                if (downStream.call()) {
                    value = { val, keep, };
                }
            },
        };
    };
}

function default$ (defaultValue) {
    return function createDefault ({ next, resolve, downStream, }) {
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
                if (downStream.call()) {
                    isSet = true;
                    next(val, keep, order);
                }
            },
        };
    };
}

function reverse () {
    return function createReverse ({ next, downStream, resolve, }) {
        let futures = [];
        return {
            resolve: function resolveReversed () {
                const runnables = futures.reverse();
                futures = [];
                return resolveOrdered(runnables, resolve);
            },
            next: function invokeReverse (val, keep, order) {
                if (downStream.call()) {
                    futures.push(() => next(val, keep, order));
                }
            },
        };
    };
}

function sort (comparator) {
    return function createSort ({ next, downStream, resolve, }) {
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
                if (downStream.call()) {
                    futures.push({ val, task: () => next(val, keep, order), });
                }
            },
        };
    };
}

function peek (callback) {
    return function createPeek ({ downStream, next, }) {
        return {
            next: function invokePeek (val, keep, order) {
                console.log(val);
                console.log(downStream.call());
                if (downStream.call()) {
                    callback(val, keep);
                    next(val, keep, order);
                }
            },
        };
    };
}

function toArray () {
    return function createToArray ({ downStream, next, resolve, }) {
        let acc = [];
        return {
            resolve: function resolveToArray () {
                next(acc, {}, [ 0, ]);
                console.log('resolve');
                acc = [];
                return resolve();
            },
            next: function invokeToArray (val) {
                if (downStream.call()) {
                    console.log('next');
                    console.log(val);
                    acc.push(val);
                }
            },
        };
    };
}

function toSet (picker) {
    return function createToArray ({ downStream, next, resolve, }) {
        let acc = new Set();
        return {
            resolve: function resolveToSet () {
                next(acc, {}, [ 0, ]);
                acc = new Set();
                return resolve();
            },
            next: function invokeToSet (val, keep) {
                if (downStream.call()) {
                    acc.add(picker(val, keep));
                }
            },
        };
    };
}

function toObject (picker) {
    return function createToObject ({ downStream, next, resolve, }) {
        let acc = {};
        return {
            resolve: function resolveToObject () {
                next(acc, {}, [ 0, ]);
                acc = {};
                return resolve();
            },
            next: function invokeToObject (val, keep) {
                if (downStream.call()) {
                    acc[picker(val, keep)] = val;
                }
            },
        };
    };
}

function toObjectSet (picker) {
    return function createToArray ({ downStream, next, resolve, }) {
        let acc = {};
        return {
            resolve: function resolveToObjectSet () {
                next(acc, {}, [ 0, ]);
                acc = {};
                return resolve();
            },
            next: function invokeToObjectSet (val, keep) {
                if (downStream.call()) {
                    acc[picker(val, keep)] = true;
                }
            },
        };
    };
}
function toMap (picker) {
    return function createToMap ({ downStream, next, resolve, }) {
        let acc = new Map();
        return {
            resolve: function resolveToMap () {
                next(acc, {}, [ 0, ]);
                acc = new Map();
                return resolve();
            },
            next: function invokeToObject (val, keep) {
                if (downStream.call()) {
                    acc.set(picker(val, keep), val);
                }
            },
        };
    };
}

function ordered () {
    return function createOrdered ({ next, downStream, resolve, }) {
        let futures = {};
        return {
            resolve: function orderedResolver () {
                const runnables = Object.entries(futures).sort((e1, e2) => orderComparator(e1[0], e2[0])).map((e) => e[1]);
                futures = {};
                return resolveOrdered(runnables, resolve);
            },
            next: function invokeOrdered (val, keep, order) {
                if (downStream.call()) {
                    futures[order] = () => next(val, keep, order);
                }
            },
        };
    };
}

function flatten (iterator) {
    return function createFlatten ({ next, downStream, }) {
        return {
            next: async function invokeFlatten (val, keep, order) {
                if (downStream.call()) {
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
    return function createMap ({ next, downStream, }) {
        return {
            next: function invokeMap (val, keep, order) {
                if (downStream.call()) {
                    next(mapper(val, keep), keep, order);
                }
            },
        };
    };
}

function parallel (limit) {
    return function createParallel ({ next, downStream, resolve, }) {
        const futures = [];
        let resolving = [];
        let downStreamTaskCount = 0;
        function onNext () {
            downStreamTaskCount--;
            while (futures.length) {
                const createTask = futures.shift();
                const task = createTask();
                if (task&& task.then) {
                    downStreamTaskCount++;
                    return task.then(onNext);
                }
                downStreamTaskCount--;
            }
        }
        return {
            resolve: function resolveParallel () {
                const downStreamTasks = resolving;
                resolving = [];
                return Promise.all(downStreamTasks).then(resolve);
            },
            next: function invokeParallel (val, keep, order) {
                if (downStream.call()) {
                    if (limit && limit<downStreamTaskCount) {
                        futures.push(() => {
                            const output = next(val, keep, order);
                            if (output && output.then) {
                                downStreamTaskCount++;
                                return output.then(onNext);
                            }
                        });
                    } else {
                        const result = next(val, keep, order);
                        if (result && result.then) {
                            downStreamTaskCount++;
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
    return function createPick ({ next, downStream, }) {
        return {
            next: function invokePick (val, keep, order) {
                if (downStream.call()) {
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
    return function createDistinctBy ({ next, downStream, resolve, }) {
        let history = {};
        return {
            resolve: function resolveDistinctBy () {
                history = {};
                return resolve();
            },
            next: function invokeDistinctBy (val, keep, order) {
                if (downStream.call()) {
                    if (historyComparator(val, history, keep)) {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}
function distinct () {
    return function createDistinct ({ next, downStream, }) {
        let history = {};
        return {
            next: function invokeDistinct (val, keep, order) {
                if (downStream.call()) {
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
    return function createFilter ({ downStream, next, }) {
        return {
            next: function invokeFilter (val, keep, order) {
                if (downStream.call()) {
                    if (predicate(val, keep)) {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}

function reject (predicate) {
    return function createReject ({ downStream, next, }) {
        return {
            next: function invokeReject (val, keep, order) {
                if (downStream.call()) {
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
    return function createOmit ({ downStream, next, }) {
        return {
            next: function invokeOmit (val, keep, order) {
                if (downStream.call()) {
                    val = Object.entries(val).filter(e => !rejectables.has(e[0])).reduce(entriesToObject, {});
                    next(val, keep, order);
                }
            },
        };
    };
}

function where (matcher) {
    const matchEntries = Object.entries(matcher);
    return function createWhere ({ downStream, next,  }) {
        return {
            next: function invokeWhere (val, keep, order) {
                if (downStream.call()) {
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
    return function createSkipWhile ({ downStream, next, resolve, }) {
        let take = false;
        return {
            resolve: function resolveSkipWhile () {
                take = false;
                return resolve();
            },
            next: function invokeSkipWhile (val, keep, order) {
                if (downStream.call()) {
                    if (take || (take = !predicate(val, keep))) {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}

function scan (scanner, acc) {
    return function createScan ({ resolve, downStream, next, }) {
        let output = acc;
        return {
            resolve: function resolveScan () {
                output = acc;
                return resolve();
            },
            next: async function invokeScan (val, keep, order) {
                if (downStream.call()) {
                    output = scanner(output, val, keep);
                    next(output, keep, order);
                }
            },
        };
    };
}

function takeUntil (predicate) {
    return function createTakeUntil ({ resolve, downStream, next, }) {
        let take = true;
        return {
            resolve: function resolveTakeUntil () {
                take = true;
                return resolve();
            },
            downStream: downStream.concat(() => take),
            next: function invokeTakeUntil (val, keep, order) {
                if (downStream.call() && take && (take = !predicate(val, keep))) {
                    next(val, keep, order);
                }
            },
        };
    };
}

function takeWhile (predicate) {
    return function createTakeWhile ({ resolve, downStream, next, }) {
        let take = true;
        return {
            downStream: downStream.concat(() => take),
            resolve: function resolveTakeWhile () {
                take = true;
                return resolve();
            },
            next: function invokeTakeWhile (val, keep, order) {
                if (take && (take = predicate(val, keep)) && downStream.call()) {
                    next(val, keep, order);
                }
            },
        };
    };
}

function skip (count) {
    count = Number(count) || 0;
    return function createSkip ({ downStream, next, }) {
        let total = 0;
        return {
            next: function invokeSkip (val, keep, order) {
                if (downStream.call()) {
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
    return function createTake ({ resolve, downStream, next, }) {
        max = Number(max) || 0;
        let taken = 0;
        return {
            downStream: downStream.concat(() => taken < max),
            resolve: function resolveTake () {
                taken = 0;
                return resolve();
            },
            next: function invokeTake (val, keep, order) {
                if (taken < max && downStream.call()) {
                    taken++;
                    next(val, keep, order);
                }
            },
        };
    };
}

function sum (summer) {
    return function createSum ({ next, downStream, resolve, }) {
        let total = 0;
        return {
            resolve: function resolveSum () {
                next(total, {}, [ 0, ]);
                total = 0;
                return resolve();
            },
            next: function invokeSum (val, keep) {
                if (downStream.call()) {
                    total += summer(val, keep);
                }
            },
        };
    };
}

function reduce (reducer, acc) {
    return function createReduce ({ next, downStream, resolve, }) {
        let output = acc;
        return {
            resolve: function resolveReduce () {
                next(output, {}, [ 0, ]);
                output = acc;
                return resolve();
            },
            next: function invokeReduce (val, keep) {
                if (downStream.call()) {
                    output = reducer(output, val, keep);
                }
            },
        };
    };
}

function some (predicate) {
    return function createSome ({ next, downStream, resolve, }) {
        let output = false;
        downStream = downStream.concat(() => !output);
        return {
            downStream,
            resolve: function resolveSome () {
                next(output, {}, [ 0, ]);
                output = false;
                return resolve();
            },
            next: function invokeSome (val, keep) {
                if (downStream.call()) {
                    output = predicate(val, keep);
                }
            },
        };
    };
}

function every (predicate) {
    return function createEvery ({ next, downStream, resolve,  }) {
        let output = true;
        downStream = downStream.concat(() => output);
        return {
            downStream,
            resolve: function resolveEvery () {
                next(output, {}, [ 0, ]);
                output = true;
                return resolve();
            },
            next: function invokeEvery (val, keep) {
                if (downStream.call()) {
                    output = !!predicate(val, keep);
                }
            },
        };
    };
}

function await$ () {
    return function createAwait ({ next, downStream, resolve, }) {
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
                if (downStream.call()) {
                    promises.push(applyAwait(val, keep, order));
                }
            },
        };
    };
}

function min (comparator) {
    return function createMin ({ next, downStream, resolve, }) {
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
                if (downStream.call()) {
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
    return function createMin ({ next, downStream, resolve, }) {
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
                if (downStream.call()) {
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
    return function createGroupBy ({ next, downStream, resolve, }) {
        let acc = {};
        return {
            resolve: function resolveGroupBy () {
                next(acc, {}, [ 0, ]);
                acc = {};
                return resolve();
            },
            next: function invokeGroupBy (val) {
                if (downStream.call()) {
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
