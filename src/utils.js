const { values, } = Object;

const NOT_SET = Symbol('NOT_SET');
const comparatorError = new Error('Expected comparator to be type of function, or object with shape `{[propA]: "ASC", [propB]: "DESC"}`');

function defaultFilter (val) {
    return !!val;
}

function createPropertyFilter (prop) {
    return function propertyFilter (val) {
        return !!val && val[prop];
    };
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

function createKeySelector (key) {
    return function keySelector (val) {
        if (val) {
            return val[key];
        }
    };
}

function createPropertySelector (keys) {
    return function propertySelector (val) {
        if (val) {
            keys.reduce((acc, k) => {
                acc[k] = val[k];
                return acc;
            }, {});
        }
    };
}

function createDistinctHistoryComparator (keys) {
    if (!keys.length) {
        console.error(keys);
        throw new Error('Invalid parameter passed to historyComparator');
    }
    const tail = keys.pop();
    return function distinctHistoryComparator (val, history) {
        let isDistinct = false;
        val = val || {};
        for (let i = 0; i<keys.length; i++) {
            const value = val[keys[i]];
            if (value in history) {
                history = history[value];
            } else {
                history = history[value] = {};
                if (!isDistinct) {
                    isDistinct = true;
                }
            }
        }
        const value = val[tail];
        if (!(value in history)) {
            history[value] = true;
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

function entriesToObject (acc, e) {
    acc[e[0]] = e[1];
    return acc;
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

function createGrouper (keys) {
    const tail = keys.pop();
    return function nestedGrouper (acc, val) {
        val = val || {};
        for (const k of keys) {
            const subVal = val[k];
            if (!acc[subVal]) {
                acc[subVal] = {};
            }
            acc = acc[subVal];
        }
        if (!acc[val[tail]]) {
            acc[val[tail]] = [];
        }
        acc[val[tail]].push(val);
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

module.exports = {
    NOT_SET,
    defaultFilter,
    createPropertyFilter,
    createDistinctHistoryComparator,
    identity,
    createSet,
    entriesToObject,
    orderComparator,
    defaultComparator,
    createObjectComparator,
    comparatorError,
    createGrouper,
    createKeySelector,
    createPropertySelector,
    createIntegerRange,
    ASC,
    DESC,
};
