const { values, } = Object;

const NOT_SET = Symbol('NOT_SET');
export const comparatorError = new Error('Expected comparator to be type of function, or object with shape `{[propA]: "ASC", [propB]: "DESC"}`');

function defaultFilter (val) {
  return !!val;
}

function createPropertyFilter (prop) {
  return function propertyFilter (val) {
    return !!val && val[prop];
  };
}

function createPropertySelector (key) {
  return function propertySelector (val) {
    return val[key];
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

const ASC = 'ASC';
const DESC = 'DESC';
function createComparator (obj) {
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
        return direction === DESC ? -1 : 1;
      }
      return direction === DESC ? 1 : -1;
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
  createPropertySelector,
  identity,
  createSet,
  entriesToObject,
  orderComparator,
  defaultComparator,
  createComparator,
};