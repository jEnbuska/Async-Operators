const { values, } = Object;

const NOT_SET = Symbol('NOT_SET');
const comparatorError = new Error('Expected comparator to be type of function, or object with shape `{[propA]: "ASC", [propB]: "DESC"}`');

function defaultFilter (val) {
    return !!val;
}

function sleep(ms){
    return new Promise(res => setTimeout(res, ms));
}

function createResolvable () {
    return new Promise(onResolvableCreated => {
        const promise = new Promise(resolve => onResolvableCreated({
            get promise () {
                return promise;
            }, resolve, }));
    });
}

const { isInteger, } = Number;
function createIntegerRange (from, to) {
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
        for (let i = 0; i<keys.length; i++) {
            const value = val[keys[i]];
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

function identity (val) {
    return val;
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
    if (a===b) {
        return 0;
    }
    if (a<b) {
        return -1;
    }
    return 1;
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

function arrayReducer (acc = [], val) {
    acc.push(val);
    return acc;
}

function createWhereFilter (obj) {
    const entries = Object.entries(obj);
    return function whereFilterer (val) {
        for (const e of entries) {
            if (val[e[0]] !== e[1]) {
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
function createSumReducer () {
    return function sumReducer (acc, val) {
        acc +=val;
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
        if (typeof val === 'string') {
            let acc = '';
            for (let i = 0; i<val.length; i++) {
                const k = omit.has(val[i]);
                if (!omit[k]) {
                    acc+=val[k];
                }
            }
            return acc;
        } else if (Array.isArray(val)) {
            const acc = [];
            for (let i = 0; i<val.length; i++) {
                if (!omit[i]) {
                    acc.push(val[i]);
                }
            }
            return acc;
        } else {
            const acc = { ...val, };
            for (const k in acc) {
                if (omit[k]) {
                    delete acc[k];
                }
            }
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

function createNegatePredicate (predicate) {
    return function negatePredicate (val) {
        return !predicate(val);
    };
}

function createScanMapper (callback, acc) {
    return function scanMapper (val) {
        return acc = callback(acc, val);
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
        defaultValue: true,
        callback () {
            return {
                value: false,
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
        for (let i = 0; i<arr.length; i++) {
            yield arr[i];
        }
    };
}
module.exports = {
    NOT_SET,
    defaultFilter,
    createDistinctByFilter,
    identity,
    orderComparator,
    defaultComparator,
    createObjectComparator,
    comparatorError,
    createGroupByReducer,
    createIntegerRange,
    ASC,
    DESC,
    createResolvable,
    arrayReducer,
    createCustomReducer,
    createMaxReducer,
    createWhereFilter,
    createSkipFilter,
    createMinReducer,
    createPickMapper,
    createOmitMapper,
    createDistinctFilter,
    createNegatePredicate,
    createSumReducer,
    createScanMapper,
    createTakeLimiter,
    createFirstEndResolver,
    createSomeEndResolver,
    createEveryEndResolver,
    createSkipWhileFilter,
    createTakeWhileFilterResolver,
    createTakeUntilFilterResolver,
    createGeneratorFromIterator,
    sleep
};
