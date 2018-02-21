/* eslint-disable consistent-return */
const { NOT_SET, createSet, orderComparator, entriesToObject, } = require('./utils');

function keep (callback) {
    return function createKeep ({ isActive, next, }) {
        return {
            next: function invokeKeep (val, keep, order) {
                if (isActive) {
                    next(val, { ...keep, ...callback(val, keep), }, order);
                }
            },
        };
    };
}

function generator (producer, isSource) {
    return function createGenerator ({ next, resolve, race, isActive, }) {
        let toBeResolved = [];
        let resolveCallback;
        async function generatorResolver (val, keep, order) {
            const gen = producer(val, keep);
            let intermediate = {};
            let i = 0;
            while (true) {
                intermediate = await race(gen.next(intermediate.value));
                if (intermediate && !intermediate.done && isActive()) {
                    next(intermediate.value, keep, [ ...order, i++, ]);
                    if (isActive()) {
                        continue;
                    }
                }
                return;
            }
        }
        if (isSource) {
            resolveCallback = function resolveGenerator () {
                return generatorResolver(undefined, {}, [ 0, ]).then(resolve);
            };
        } else {
            resolveCallback = function resolveGenerator () {
                return Promise.all(toBeResolved).then(resolve);
            };
        }
        return {
            resolve: resolveCallback,
            next: function invokeGenerator (val, keep, order) {
                if (isActive()) {
                    toBeResolved.push(generatorResolver(val, keep, order));
                }
            },
        };
    };
}

function first () {
    return async function createFirst ({ resolve, next, extendRace, }) {
        let value = {};
        const { isActive, retireUpStream, ...rest } = await extendRace();
        return {
            isActive,
            retireUpStream,
            ...rest,
            resolve: function resolveFirst () {
                const { val, keep = {}, }= value;
                next(val, keep, [ 0, ]);
                return resolve();
            },
            next: function invokeFirst (val, keep) {
                if (isActive()) {
                    value = { val, keep, };
                    retireUpStream();
                }
            },
        };
    };
}

function default$ (defaultValue) {
    return function createDefault ({ next, resolve, isActive, }) {
        let isSet = false;
        return {
            resolve: function resolveDefault () {
                if (isSet) {
                    isSet = false;
                } else {
                    next(defaultValue, {}); // TODO check isActive
                }
                return resolve();
            },
            next: function invokeDefault (val, keep, order) {
                if (isActive()) {
                    isSet = true;
                    next(val, keep, order);
                }
            },
        };
    };
}

function reverse () {
    return function createReverse ({ next, isActive, resolve, race, }) {
        let futures = [];
        return {
            resolve: function resolveReversed () {
                const runnables = futures.reverse();
                let index = 0;
                return (function orderedResolver () {
                    if (isActive() && index<runnables.length) {
                        return race(runnables[index++]()).then(orderedResolver);
                    }
                })().then(resolve);
            },
            next: function invokeReverse (val, keep, order) {
                if (isActive()) {
                    futures.push(() => next(val, keep, order));
                }
            },
        };
    };
}

function sort (comparator) {
    return function createSort ({ next, isActive, resolve, race, }) {
        let futures = [];
        const compare = function runComparison (a, b) {
            return comparator(a.val, b.val);
        };
        return {
            resolve: function resolveSort () {
                const runnables = futures.sort(compare).map(it => it.task);
                futures = [];
                let index = 0;
                return (function orderedResolver () {
                    if (isActive() && index<runnables.length) {
                        return race(runnables[index++]()).then(orderedResolver);
                    }
                })().then(resolve);
            },
            next: function invokeReverse (val, keep, order) {
                if (isActive) {
                    futures.push({ val, task: () => next(val, keep, order), });
                }
            },
        };
    };
}

function peek (callback) {
    return function createPeek ({ next, isActive, }) {
        return {
            next: function invokePeek (val, keep, order) {
                if (isActive()) {
                    callback(val, keep);
                    next(val, keep, order);
                }
            },
        };
    };
}

function toArray () {
    return function createToArray ({ isActive, next, resolve, }) {
        let acc = [];
        return {
            resolve: function resolveToArray () {
                next(acc, {}, [ 0, ]); // TODO check isActive
                acc = [];
                return resolve();
            },
            next: function invokeToArray (val) {
                if (isActive()) {
                    acc.push(val);
                }
            },
        };
    };
}

function toSet (picker) {
    return function createToArray ({ isActive, next, resolve, }) {
        let acc = new Set();
        return {
            resolve: function resolveToSet () {
                next(acc, {}, [ 0, ]); // TODO check isActive
                acc = new Set();
                return resolve();
            },
            next: function invokeToSet (val, keep) {
                if (isActive()) {
                    acc.add(picker(val, keep));
                }
            },
        };
    };
}

function toObject (picker) {
    return function createToObject ({ isActive, next, resolve, }) {
        let acc = {};
        return {
            resolve: function resolveToObject () {

                next(acc, {}, [ 0, ]); // TODO check isActive

                acc = {};
                return resolve();
            },
            next: function invokeToObject (val, keep) {
                if (isActive()) {
                    acc[picker(val, keep)] = val;
                }
            },
        };
    };
}

function toObjectSet (picker) {
    return function createToArray ({ isActive, next, resolve, }) {
        let acc = {};
        return {
            resolve: function resolveToObjectSet () {
                next(acc, {}, [ 0, ]); // TODO check isActive
                acc = {};
                return resolve();
            },
            next: function invokeToObjectSet (val, keep) {
                if (isActive()) {
                    acc[picker(val, keep)] = true;
                }
            },
        };
    };
}
function toMap (picker) {
    return function createToMap ({ isActive, next, resolve, }) {
        let acc = new Map();
        return {
            resolve: function resolveToMap () {
                next(acc, {}, [ 0, ]); // TODO check isActive
                acc = new Map();
                return resolve();
            },
            next: function invokeToObject (val, keep) {
                if (isActive()) {
                    acc.set(picker(val, keep), val);
                }
            },
        };
    };
}

function ordered () {
    return function createOrdered ({ next, isActive, resolve, race, }) {
        let futures = {};
        return {
            resolve: function orderedResolver () {
                const runnables = Object.entries(futures).sort((e1, e2) => orderComparator(e1[0], e2[0])).map((e) => e[1]);
                let index = 0;
                return (function orderedResolver () {
                    if (isActive() && index<runnables.length) {
                        return race(runnables[index++]()).then(orderedResolver);
                    }
                })().then(resolve);
            },
            next: function invokeOrdered (val, keep, order) {
                if (isActive()) {
                    futures[order] = () => next(val, keep, order);
                }
            },
        };
    };
}

function flatten (iterator) {
    return function createFlatten ({ next, isActive, }) {
        return {
            next: async function invokeFlatten (val, keep, order) {
                if (isActive()) {
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
    return function createMap ({ next, isActive, }) {
        return {
            next: function invokeMap (val, keep, order) {
                if (isActive()) {
                    next(mapper(val, keep), keep, order);
                }
            },
        };
    };
}

function parallel (limit) {
    return function createParallel ({ next, isActive, resolve, race, }) {
        const futures = [];
        let resolving = [];
        let downStreamTaskCount = 0;
        function onNext () {
            downStreamTaskCount--;
            while (futures.length && isActive()) {
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
                if (isActive()) {
                    if (limit && limit<downStreamTaskCount) {
                        futures.push(() => {
                            const output = next(val, keep, order);
                            if (output && output.then) {
                                downStreamTaskCount++;
                                return output.then(onNext);
                            }
                        });
                    } else {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}

function pick (keys) {
    const keySet = createSet(keys);
    return function createPick ({ next, isActive, }) {
        return {
            next: function invokePick (val, keep, order) {
                if (isActive()) {
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
    return function createDistinctBy ({ next, isActive, resolve, }) {
        let history = {};
        return {
            resolve: function resolveDistinctBy () {
                history = {};
                return resolve();
            },
            next: function invokeDistinctBy (val, keep, order) {
                if (isActive()) {
                    if (historyComparator(val, history, keep)) {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}
function distinct () {
    return function createDistinct ({ next, isActive, }) {
        let history = {};
        return {
            next: function invokeDistinct (val, keep, order) {
                if (isActive()) {
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
    return function createFilter ({ isActive, next, }) {
        return {
            next: function invokeFilter (val, keep, order) {
                if (isActive()) {
                    if (predicate(val, keep)) {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}

function reject (predicate) {
    return function createReject ({ isActive, next, }) {
        return {
            next: function invokeReject (val, keep, order) {
                if (isActive()) {
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
    return function createOmit ({ isActive, next, }) {
        return {
            next: function invokeOmit (val, keep, order) {
                if (isActive()) {
                    val = Object.entries(val).filter(e => !rejectables.has(e[0])).reduce(entriesToObject, {});
                    next(val, keep, order);
                }
            },
        };
    };
}

function where (matcher) {
    const matchEntries = Object.entries(matcher);
    return function createWhere ({ isActive, next,  }) {
        return {
            next: function invokeWhere (val, keep, order) {
                if (isActive()) {
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
    return function createSkipWhile ({ isActive, next, resolve, }) {
        let take = false;
        return {
            resolve: function resolveSkipWhile () {
                take = false;
                return resolve();
            },
            next: function invokeSkipWhile (val, keep, order) {
                if (isActive()) {
                    if (take || (take = !predicate(val, keep))) {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}

function delay (ms) {
    return function createDelay ({ resolve, isActive, next, race, }) {
        const delays = [];
        function createDelay (val, keep, order) {
            return delays.push(
                race(new Promise(res => setTimeout(function delayDone () {
                    if (isActive()) {
                        next(val, keep, order);
                        res();
                    } else {
                        console.log('cancelled ' + val);
                    }
                }, ms)))
            );
        }
        return {
            resolve: function resolveDelay () {
                return Promise.all(delays).then(resolve);
            },
            next: function invokeDelay (val, keep, order) {
                if (isActive()) {
                    createDelay(val, keep, order);
                }
            },
        };
    };
}

function scan (scanner, acc) {
    return function createScan ({ resolve, isActive, next, }) {
        let output = acc;
        return {
            resolve: function resolveScan () {
                output = acc;
                return resolve();
            },
            next: async function invokeScan (val, keep, order) {
                if (isActive()) {
                    output = scanner(output, val, keep);
                    next(output, keep, order);
                }
            },
        };
    };
}

function takeUntil (predicate) {
    return async function createTakeUntil ({ next, extendRace, }) {
        const { isActive, retireUpStream, ...rest } = await extendRace();
        return {
            ...rest,
            retireUpStream,
            isActive,
            next: function invokeTakeUntil (val, keep, order) {
                if (isActive()) {
                    if (predicate(val, keep)) {
                        retireUpStream();
                    } else {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}

function takeWhile (predicate) {
    return async function createTakeWhile ({ next, extendRace, }) {
        const { isActive, retireUpStream, ...rest } = await extendRace();
        return {
            ...rest,
            isActive,
            retireUpStream,
            next: function invokeTakeWhile (val, keep, order) {
                if (isActive()) {
                    if (predicate(val, keep)) {
                        next(val, keep, order);
                    } else {
                        retireUpStream();
                    }
                }
            },
        };
    };
}

function skip (count) {
    count = Number(count) || 0;
    return function createSkip ({ isActive, next, }) {
        let total = 0;
        return {
            next: function invokeSkip (val, keep, order) {
                if (isActive()) {
                    if (total<count) {
                        total++;
                    } else {
                        next(val, keep, order);
                    }
                }
            },
        };
    };
}
function take (max) {
    return async function createTake ({ next, extendRace, }) {
        max = Number(max) || 0;
        let taken = 0;
        const { isActive, ...rest } = await extendRace();
        return {
            ...rest,
            isActive,
            next: function invokeTake (val, keep, order) {
                if (isActive() && taken < max) {
                    taken++;
                    next(val, keep, order);
                }
            },
        };
    };
}

function sum (summer) {
    return function createSum ({ next, isActive, resolve, }) {
        let total = 0;
        return {
            resolve: function resolveSum () {
                next(total, {}, [ 0, ]);
                return resolve();
            },
            next: function invokeSum (val, keep) {
                if (isActive()) {
                    total += summer(val, keep);
                }
            },
        };
    };
}

function reduce (reducer, acc) {
    return function createReduce ({ next, isActive, resolve, }) {
        let output = acc;
        return {
            resolve: function resolveReduce () {
                next(output, {}, [ 0, ]);
                return resolve();
            },
            next: function invokeReduce (val, keep) {
                if (isActive()) {
                    output = reducer(output, val, keep);
                }
            },
        };
    };
}

function some (predicate) {
    return async function createSome ({ next, extendRace, resolve, }) {
        let output = false;
        const { isActive, retireUpStream, ...rest } = await extendRace();
        return {
            ...rest,
            retireUpStream,
            isActive,
            resolve: function resolveSome () {
                next(output, {}, [ 0, ]);
                output = false;
                return resolve();
            },
            next: function invokeSome (val, keep) {
                if (isActive()) {
                    output = predicate(val, keep);
                    if (output) {
                        retireUpStream();
                    }
                }
            },
        };
    };
}

function every (predicate) {
    return async function createEvery ({ next, extendRace, resolve,  }) {
        let output = true;
        const { isActive, retireUpStream, ...rest } = await extendRace();
        return {
            ...rest,
            isActive,
            retireUpStream,
            resolve: function resolveEvery () {
                next(output, {}, [ 0, ]);
                return resolve();
            },
            next: function invokeEvery (val, keep) {
                if (isActive) {
                    output = !!predicate(val, keep);
                    if (!output) {
                        retireUpStream();
                    }
                }
            },
        };
    };
}

function await$ () {
    return function createAwait ({ next, isActive, race, resolve, }) {
        let promises = [];
        function applyAwait (val, keep, order) {
            return race(val).then(val => isActive() && next(val, keep, order));
        }
        return {
            resolve: function resolveAwait  () {
                const toBeResolved = promises;
                promises = [];
                return Promise.all(toBeResolved).then(resolve);
            },
            next: function invokeAwait (val, keep, order) {
                if (isActive()) {
                    promises.push(applyAwait(val, keep, order));
                }
            },
        };
    };
}

function min (comparator) {
    return function createMin ({ next, isActive, resolve, }) {
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
                if (isActive() && (min===NOT_SET || comparator(min, val, keep) > 0)) {
                    min = val;
                }
            },
        };
    };
}

function max (comparator) {
    return function createMin ({ next, isActive, resolve, }) {
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
                if (isActive() && (max === NOT_SET || comparator(max, val, keep) < 0)) {
                    max= val;
                }
            },
        };
    };
}

function groupBy (callback) {
    return function createGroupBy ({ next, isActive, resolve, }) {
        let acc = {};
        return {
            resolve: function resolveGroupBy () {
                next(acc, {}, [ 0, ]);
                return resolve();
            },
            next: function invokeGroupBy (val) {
                if (isActive()) {
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
    delay,
};
