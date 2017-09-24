/* eslint-disable no-return-assign,consistent-return */
/**
 * Created by joonaenbuska on 24/07/2017.
 */

const { entries, } = Object;
const NOT_SET = Symbol('NOT_SET');
const PREVIOUS = Symbol('PREVIOUS');
export default function () {
  return new Lazy();
}

const has = Object.prototype.hasOwnProperty;

class Lazy {

  static defaults = {
    createTakeLast: undefined,
    createTakeAll: [],
    createSum: 0,
    createTake: [],
  };

  constructor(middlewares = []) {
    this.middlewares = middlewares;
  }

  map(callback = async function (val) { return await val; }) {
    return this._create(Lazy.map(callback));
  }

  resolve() {
    return this._create(Lazy.resolve());
  }

  parallel() {
    if (this.middlewares.length) {
      throw new Error('Parallel must be first middleware of lazy operators');
    }
    return this._create(Lazy.parallel());
  }

  filter(predicate) {
    return this._create(Lazy.filter(predicate));
  }

  distinctBy(picker) {
    if (typeof picker === 'string') {
      const attribute= picker;
      picker = (val) => val[attribute];
    }
    return this._create(Lazy.distinctBy(picker));
  }

  peek(callback) {
    return this._create(Lazy.peek(callback));
  }

  takeUntil(predicate) {
    if (typeof predicate === 'string') {
      const property= predicate;
      predicate = val => !!val[property];
    }
    return this._create(Lazy.takeUntil(predicate));
  }

  skipWhile(predicate) {
    if (typeof predicate === 'string') {
      const property= predicate;
      predicate = val => !!val[property];
    }
    return this._create(Lazy.skipWhile(predicate));
  }

  // DO NOT NEVER CHANGE THE VALUE OF ACC
  scan(scanner = ((acc, next) => [ ...acc, next, ]), acc = undefined) {
    return this._create(Lazy.scan(scanner, acc));
  }

  take(number) {
    return this._create(Lazy.take(number));
  }

  takeLast() {
    return this._create(Lazy.takeLast());
  }

  every(predicate) {
    return this._create(Lazy.every(predicate));
  }

  some(predicate) {
    return this._create(Lazy.some(predicate));
  }

  sum() {
    return this._create(Lazy.sum());
  }

  takeAll() {
    return this._create(Lazy.takeAll());
  }

  async apply(...sources) {
    const { middlewares, } = this;
    let head = null;
    const state = { done: false, last: sources.length-1, };
    let tail = middlewares[middlewares.length-1](null, state);
    for (let i = middlewares.length-1; i>0; i--) {
      head = tail;
      tail = middlewares[i-1](head, state);
    }
    let output;
    for (let i = 0; i<sources.length && !state.done; i++) {
      const result = await tail(sources[i], i);

      if (result) {
        output = result.value;
      }
    }
    if (output === undefined) {
      return Lazy.defaults[middlewares[middlewares.length-1].name];
    }
    return output;
  }

  _create(operation) {
    return new Lazy([ ...this.middlewares, operation, ]);
  }

  static peek(callback) {
    return function createPeek(next, state) {
      return async function applyPeek(val, index) {
        if (state.done) {
          return;
        }
        await callback(val, index);
        return await next(val, index, false);
      };
    };
  }

  static resolve() {
    return function createResolve(next, state) {
      return async function applyResolve(val, index) {
        if (state.done) {
          return;
        }
        return await next(await val, index);
      };
    };
  }

  static filter(predicate = defaultFilter) {
    return function createFilter(next, state) {
      return async function applyFilter(val, index) {
        if (state.done || !await predicate(val, index)) {
          return;
        }
        return await next(val, index);
      };
    };
  }

  static map(mapper) {
    return function createMap(next, state) {
      return async function applyMap(val, index) {
        if (state.done) {
          return;
        }
        const result = await mapper(val, index);
        return await next(result, index);
      };
    };
  }

  static distinctBy(picker = (next) => next) {
    return function createDistinctBy(next, state) {
      const history = {};
      return async function applyDistinctBy(val, index) {
        const result = await picker(val, index);
        if (state.done || history[result]) {
          return;
        }
        history[result] = true;
        return await next(val, index);
      };
    };
  }

  static parallel() {
    return function createParallel(next, state) {
      const tasks = [];
      let result;
      return async function applyParallel(val, index) {
        if (state.done) {
          return;
        }
        tasks.push(next(val, index)
          .then(res => {
            if (res) {
              result=res;
            }
          }));
        if (state.last!==index) {
          return;
        }
        await Promise.all(tasks);
        return result;
      };
    };
  }

  static takeUntil(predicate) {
    return function createTakeUntil(next, state) {
      return async function applyTakeUntil(val, index) {
        if (state.done) {
          return;
        }
        if (!await predicate(val, index)) {
          state.done=true;
          return;
        }
        return await next(val, index);
      };
    };
  }

  static skipWhile(predicate) {
    return function createSkipWhile(next, state) {
      let started = false;
      return async function applySkipWhile(val, index) {
        if (state.done) {
          return;
        }
        if (started) {
          return await next(val, index);
        } else if (!await predicate(val, index)) {
          started = true;
          return await next(val, index);
        }
      };
    };
  }

  static sum() {
    return function createSum(next, state) {
      let value = 0;
      return async function applySum(val, index) {
        val = !state.done && await val;
        if (state.done) {
          return;
        }
        value +=val;
        return { value, };
      };
    };
  }

// DO NOT NEVER CHANGE THE VALUE OF ACC
  static scan(scanner, acc) {
    return function createReduce(next, state) {
      let privateAcc = acc;
      return async function (val, index) {
        if (state.done) {
          return;
        }
        privateAcc = await scanner(privateAcc, val, index);
        return await next(privateAcc, index);
      };
    };
  }

  static takeLast() {
    return function createTakeLast(next, state) {
      return async function applyTakeLast(val, index) {
        val = !state.done && await val;
        if (state.done) {
          return;
        }
        return { value: val, };
      };
    };
  }

  static take(number) {
    return function createTakeAll(next, state) {
      let value = [];
      return async function applyTakeAll(val, index) {
        val = !state.done && await val;
        if (state.done) {
          return;
        }
        value = [ ...value, val, ];
        state.done = state.done || value.length === number;
        return { value, };
      };
    };
  }

  static takeAll() {
    return function createTakeAll(next, state) {
      let value = [];
      return async function applyTakeAll(val, index) {
        val = !state.done && await val;
        if (state.done) {
          return;
        }
        value = [ ...value, val, ];
        return { value, };
      };
    };
  }

  static every(predicate) {
    return function createEvery(next, state) {
      let everyIs = true;
      return async function (val, index) {
        everyIs = everyIs && !!await predicate(val, index);
        if (state.done) {
          return;
        }
        state.done = !everyIs;
        return { value: everyIs, };
      };
    };
  }

  static some(predicate) {
    return function createSome(next, state) {
      let someIs = false;
      return async function applySome(val, index) {
        someIs = someIs || !!await predicate(val, index);
        if (state.done) {
          return;
        }
        if (someIs) {
          state.done = true;
        }
        return { value: someIs, };
      };
    };
  }
}

function defaultComparator(a, b) {
  if (a===b) {
    return 0;
  }
  if (a<b) {
    return -1;
  }
  return 1;
}

function defaultFilter(val) {
  return !!val;
}
function alwaysTrue() { return true; }