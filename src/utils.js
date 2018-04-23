const { values, } = Object;

const NOT_SET = Symbol('NOT_SET');
const INDEX = Symbol('INDEX');
const MIDDLEWARES = Symbol('MIDDLEWARES');
const SHARED = Symbol('SHARED');
const TAIL = Symbol('TAIL');
const CREATE = Symbol('CREATE');

function defaultFilter (val) {
    return !!val;
}

function sleep (ms) {
    return new Promise(res => setTimeout(res, ms));
}

const { isInteger, } = Number;
function createIntegerRange (from = 0, to = 0) {
    if (isInteger(from) && isInteger(to)) {
        const integers = [];
        if (from<to) {
            for (let i = from; i<to; i++) {
                integers.push(i);
            }
        } else {
            for (let i = from; i>to; i--) {
                integers.push(i);
            }
        }
        return integers;
    }
    console.error({ from, to, });
    throw new Error('"createIntegerRange" got unexpected input as parameters. Expected (from: int, to: int)');
}

function createDistinctByFilter (keys) {
    if (!keys.length) {
        console.error(keys); throw new Error('Invalid parameter passed to historyComparator');
    }
    const tail = keys.pop();
    const history = {};
    return function distinctByFilter (val) {
        let subHistory = history;
        let isDistinct = false;
        val = val || {};
        for (const next of keys) {
            const value = val[next];
            if (subHistory[value]) {
                subHistory = subHistory[value];
            } else {
                subHistory = subHistory[value] = {};
                if (!isDistinct) {
                    isDistinct = true;
                }
            }
        }
        const value = val[tail];
        if (!(value in subHistory)) {
            subHistory[value] = true;
            if (!isDistinct) {
                isDistinct = true;
            }
        }
        return isDistinct;
    };
}

function createTakeLastByFilter (keys) {
    if (!keys.length) {
        console.error(keys);
        throw new Error('Invalid parameter passed to historyComparator');
    }
    return function lastByFilter (value, futures) {
        const latestDistinctFutures = [];
        for (let i = 0; i<keys.length && futures.length; i++) {
            const key = keys[i];
            futures = futures.filter(e => {
                if (e.value[key] !== value[key]) {
                    latestDistinctFutures.push(e);
                    return false;
                } else {
                    return true;
                }
            });
        }
        return latestDistinctFutures;
    };
}

function createTakeLastFilter (max) {
    return function lastFilter (value, futures) {
        const nextFutures = [];
        const to = futures.length;
        const from = Math.max(0, futures.length-max+1);
        for (let i = from; i< to; i++) {
            nextFutures.push(futures[i]);
        }
        return nextFutures;
    };
}

function createSet (keys) {
    return values(keys)
    .reduce(function (acc, key) {
        acc[key] = true;
        return acc;
    }, {});
}

function orderComparator (a, b) {
    const { length, } = a;
    for (let i = 0; i<length; i++) {
        const diff = a[i]-b[i];
        if (diff) {
            return diff;
        }
    }
    return 0;
}

function defaultComparator (a, b) {
    if (a<b) {
        return -1;
    } else if (a>b) {
        return 1;
    } else {
        return 0;
    }
}

function createGroupByReducer (keys) {
    const tail = keys.pop();
    return function nestedGrouper (acc, val) {
        val = val || {};
        let subAcc = acc;
        for (const k of keys) {
            const subVal = val[k];
            if (!subAcc[subVal]) {
                subAcc[subVal] = {};
            }
            subAcc = subAcc[subVal];
        }
        if (!subAcc[val[tail]]) {
            subAcc[val[tail]] = [];
        }
        subAcc[val[tail]].push(val);
        return acc;
    };
}

const ASC = 'ASC';
const DESC = 'DESC';
function createObjectComparator (obj) {
    const comparators = Object.entries(obj).map(([ property, direction, ]) => {
        if (direction !== DESC && direction !== ASC) {
            throw comparatorError;
        }
        return function comparator (a, b) {
            const same = a[property] === b[property];
            if (same) {
                return 0;
            }
            if (a[property] < b[property]) {
                return direction === ASC ? -1 : 1;
            }
            return direction === ASC ? 1 : -1;
        };
    });
    return function comparator (a, b) {
        let result = 0;
        for (let i = 0; i<comparators.length && result === 0; i++) {
            result = comparators[i](a, b);
        }
        return result;
    };
}

function createWhereFilter (obj) {
    const entries = Object.entries(obj);
    return function whereFilterer (val) {
        for (const [ k, v, ] of entries) {
            if (val[k] !== v) {
                return;
            }
        }
        return true;
    };
}

function createSkipFilter (count) {
    let current = 0;
    return function skipFilter () {
        if (count>current) {
            current++;
            return false;
        }
        return true;
    };
}

function createMinReducer (comparator) {
    return function minReducer (acc = NOT_SET, val) {
        if (acc===NOT_SET || comparator(acc, val) > 0) {
            return val;
        }
        return acc;
    };
}
function createMaxReducer (comparator) {
    return function maxReducer (acc = NOT_SET, val) {
        if (acc===NOT_SET || comparator(acc, val) < 0) {
            return val;
        }
        return acc;
    };
}

function createCustomReducer (callback) {
    return function reducer (acc, val) {
        return callback(acc, val);
    };
}
function createSumReducer (mapper) {
    return function sumReducer (acc, val) {
        acc +=mapper(val);
        return acc;
    };
}
function createPickMapper (keys) {
    return function pickMapper (val) {
        if (typeof val === 'string') {
            return keys.reduce((subStr, k) => subStr + val[k], '');
        } else if (Array.isArray(val)) {
            return keys.reduce((acc, i) => {
                acc.push(val[i]);
                return acc;
            }, []);
        } else {
            return keys.reduce((acc, k) => {
                acc[k] = val[k];
                return acc;
            }, {});
        }
    };
}

function createOmitMapper (keys) {
    const omit = createSet(keys);
    return function omitMapper (val) {
        if (Array.isArray(val)) {
            return val.filter((_, i) => !omit[i]);
        } else {
            const acc = { ...val, };
            for (const k in omit) delete acc[k];
            return acc;
        }
    };
}

function createDistinctFilter () {
    let history = {};
    return function distinctFilter (val) {
        if (!history[val]) {
            history[val] = true;
            return true;
        }
        return false;
    };
}

function createTakeLimiter (limit) {
    let current = 0;
    return function takeLimiter () {
        current++;
        if (current === limit) {
            return true;
        } else if (current>limit) {
            throw new Error('"current" should never exceed limit');
        }
        return false;
    };
}

function createEveryEndResolver (predicate) {
    return {
        defaultValue: true,
        callback (val) {
            const value = !!predicate(val);
            return {
                done: !value,
                value,
            };
        },
    };
}

function createFirstEndResolver () {
    return {
        defaultValue: undefined,
        callback (value) {
            return {
                value,
                done: true,
            };
        },
    };
}

function createSomeEndResolver (predicate) {
    return {
        defaultValue: false,
        callback (val) {
            if (predicate(val)) {
                return {
                    value: true,
                    done: true,
                };
            } else {
                return {
                    done: false,
                    value: false,
                };
            }
        },
    };
}

function createSkipWhileFilter (predicate) {
    let open = false;
    return function skipWhileFilterer (val) {
        if (!open) {
            open = !predicate(val);
            return open;
        } else return true;
    };
}
function createTakeWhileFilterResolver (predicate) {
    return function takeWhileFilterResolver (val) {
        return predicate(val);
    };
}
function createTakeUntilFilterResolver (predicate) {
    let open = true;
    return function takeWhileFilterResolver (val) {
        if (open) {
            open = !predicate(val);
            return open;
        }
        return false;
    };
}
function createGeneratorFromIterator (createIterator = Object.values) {
    return function * iterableGenerator (val) {
        const arr = createIterator(val);
        for (const next of arr) {
            yield next;
        }
    };
}

function createResolvable () {
    return new Promise(returnResolvable => {
        const _promise = new Promise(res => {
            let resolved = false;
            return returnResolvable({
                isResolved () {
                    return resolved;
                },
                get promise () {
                    return _promise;
                },
                get resolve () {
                    resolved = true;
                    return res;
                },
            });
        });
    });
}

function createGetDelay (from) {
    if (Number.isInteger(from)) {
        return () => from;
    } else if (typeof from=== 'function') {
        return from;
    } else {
        try {
            console.error({ ms: from, });
        } catch (e) {}
        throw new Error('Invalid delay passed to delay middleware');
    }
}

function createLatestCanceller () {
    let prev = { resolve () {}, };
    return function latestCanceller (upStream) {
        prev.resolve();
        prev = upStream;
    };
}

function createLatestByCanceller (keys) {
    if (!keys.length) return createLatestCanceller();
    const path = keys.slice(0, keys.length-1);
    const tail = keys[keys.length-1];
    const executions = {};
    return function latestByCanceller (upStream, value) {
        const target = path.reduce((acc, k) => acc[value[k]] || (acc[value[k]] = {}), executions);
        if (target[value[tail]]) target[value[tail]].resolve();
        target[value[tail]] = upStream;
    };
}

async function createMiddlewares (middlewares) {
    let acc = middlewares[middlewares.length-1];
    for (let i = middlewares.length-2; i>=0; i--) {
        const current = acc = { ...acc, ...await middlewares[i](acc), };
        let { onNext, } = acc;
        if (onNext.name!=='proxy') {
            acc.onNext = function proxy (param) {
                if (param.upStream.isActive() && current.isActive()) {
                    return onNext(param);
                }
            };
        }
    }
    return acc;
}

module.exports = {
    NOT_SET,
    ASC,
    DESC,
    defaultFilter,
    createDistinctByFilter,
    orderComparator,
    defaultComparator,
    createObjectComparator,
    createGroupByReducer,
    createIntegerRange,
    createCustomReducer,
    createMaxReducer,
    createWhereFilter,
    createSkipFilter,
    createMinReducer,
    createPickMapper,
    createOmitMapper,
    createDistinctFilter,
    createSumReducer,
    createTakeLimiter,
    createFirstEndResolver,
    createSomeEndResolver,
    createEveryEndResolver,
    createSkipWhileFilter,
    createTakeWhileFilterResolver,
    createTakeUntilFilterResolver,
    createGeneratorFromIterator,
    sleep,
    createTakeLastByFilter,
    createGetDelay,
    createTakeLastFilter,
    createLatestByCanceller,
    createLatestCanceller,
    createMiddlewares,
    INDEX,
    MIDDLEWARES,
    SHARED,
    TAIL,
    CREATE,
};
