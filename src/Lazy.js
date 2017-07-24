/**
 * Created by joonaenbuska on 24/07/2017.
 */

export default function (val) {
  return new Lazy(val);
}

const has = Object.prototype.hasOwnProperty;

class Lazy {

  constructor(val) {
    this.val = val;
    this.keys = Object.keys(val);
    this.middlewares = [];
  }

  map(callback) {
    this.middlewares.push(map(callback));
    return this;
  }

  filter(predicate) {
    this.middlewares.push(filter(predicate));
    return this;
  }

  takeUntil(predicate) {
    this.middlewares.push(takeUntil(predicate));
    return this;
  }

  takeWhile(predicate) {
    this.middlewares.push(takeWhile(predicate));
    return this;
  }

  distinct(predicate) {
    this.middlewares.push(distinct(predicate));
    return this;
  }

  first(predicate = () => true) {
    const { middlewares, } = this;
    const result = { value: false, };
    middlewares.push(() => (val) => {
      if (predicate(val)) {
        result.value = val;
        return false;
      }
      return true;
    });
    return this.run(result);
  }

  has(predicate) {
    const { middlewares, } = this;
    const result = { value: false, };
    middlewares.push(() => (val) => {
      if (predicate(val)) {
        result.value = true;
        return false;
      }
      return true;
    });
    return this.run(result);
  }

  toArray() {
    const result = { value: [], };
    this.middlewares.push(() => (val) => result.value.push(val));
    return this.run(result);
  }

  reduce(reducer, acc={}) {
    const result = { value: acc, };
    this.middlewares.push(() => (val) => reducer(acc, val));
    return this.run(result);
  }

  run(result) {
    const { val, keys, middlewares, } = this;
    const { length, } = middlewares;
    for (let i = length-1; i>=0; i--) {
      middlewares[i] = middlewares[i](middlewares[i+1]);
    }
    const head = middlewares[0];
    let index = 0;
    while (has.call(keys, index)) {
      if (!head(val[keys[index++]])) {
        break;
      }
    }
    return result.value;
  }
}

function filter(predicate) {
  return function createFilter(next) {
    return function applyFilter(val) {
      if (predicate(val)) {
        return next(val);
      }
      return true;
    };
  };
}
function map(mapper) {
  return function createMap(next) {
    return function applyMap(val) {
      return next(mapper(val));
    };
  };
}

function takeWhile(predicate) {
  return function createTakeWhile(next) {
    return function applyTakeWhile(val) {
      if (!predicate(val)) {
        return next(val);
      }
      return false;
    };
  };
}
const notSet = Symbol('NOT_SET');
function distinct(predicate = (next, prev) => prev!==next) {
  return function createDistinct(next) {
    let prev = notSet;
    return function applyDistinct(val) {
      if (prev === notSet || !predicate(next, prev)) {
        prev = val;
        return next(val);
      }
      return true;
    };
  };
}

function takeUntil(predicate) {
  return function createTakeUntil(next) {
    return function applyTakeUntil(val) {
      if (predicate(val)) {
        return next(val);
      }
      return false;
    };
  };
}