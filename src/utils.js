const { values, } = Object;

const NOT_SET = Symbol('NOT_SET');

function defaultFilter (val) {
  return !!val;
}

function reduceToArray (acc = [], next) {
  return [ ...acc, next, ];
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

function createComparator (key) {
  return function comparator (a, b) {
    if (a[key]===b[key]) {
      return 0;
    }
    if (a[key]<b[key]) {
      return -1;
    }
    return 1;
  };
}
function createCompositeComparator (comparators) {
  return function compositeComparator (a, b) {
    for (const comp of comparators) {
      const diff = comp(a, b);
      if (diff!==0) {
        return diff;
      }
    }
    return 0;
  }
}

module.exports = {
  NOT_SET,
  defaultFilter,
  reduceToArray,
  createCompositeComparator,
  createPropertyFilter,
  createPropertySelector,
  identity,
  createSet,
  entriesToObject,
  orderComparator,
  defaultComparator,
  createComparator,
};