const { values, } = Object;

export const NOT_SET = Symbol('NOT_SET');

export function defaultFilter (val) {
  return !!val;
}

export function reduceToArray (acc = [], nextMiddleware) {
  return [ ...acc, nextMiddleware, ];
}

export function createPropertyFilter (prop) {
  return function propertyFilter (val) {
    return !!val && val[prop];
  };
}

export function createPropertySelector (key) {
  return function propertySelector (val) {
    return val[key];
  };
}

export function identity (val) {
  return val;
}

export function createSet (keys) {
  return values(keys)
    .reduce(function (acc, key) {
      acc[key] = true;
      return acc;
    }, {});
}

export function entriesToObject (acc, e) {
  acc[e[0]] = e[1];
  return acc;
}

export function orderComparator (a, b) {
  const { length, } = a;
  for (let i = 0; i<length; i++) {
    const diff = a[i]-b[i];
    if (diff) {
      return diff;
    }
  }
  return 0;
}

export function defaultComparator (a, b) {
  if (a===b) {
    return 0;
  }
  if (a<b) {
    return -1;
  }
  return 1;
}
