/* eslint-disable no-return-assign,consistent-return,no-confusing-arrow */
/**
 * Created by joonaenbuska on 24/07/2017.
 */
import CompositeAnd from './CompositeAnd';

// Create takeWhile

const NOT_SET = Symbol('NOT_SET');
const PREVIOUS = Symbol('PREVIOUS');
const { entries, values, } = Object;
export default function () {
  return new Lazy();
}

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

  _create(operation) {
    return new Lazy([ ...this.middlewares, operation, ]);
  }

  async invoke(...sources) {
    const { middlewares, } = this;
    let head = null;
    const execution = { result: NOT_SET, };
    let tail = middlewares[middlewares.length-1]({ active: CompositeAnd(), }, execution);
    for (let i = middlewares.length-1; i>0; i--) {
      head = tail;
      tail = middlewares[i-1](head, execution);
    }
    const { active, next, } = tail;
    for (let i = 0; i<sources.length && active.call(); i++) {
      if (sources.length-1===i) {
        execution.last = true;
      }
      await next(sources[i], i);
    }
    const { result, } = execution;
    if (result === NOT_SET) {
      return Lazy.defaults[middlewares[middlewares.length-1].name];
    }
    return result;
  }

  ordered() {
    if (this.middlewares.some(mv => mv.name==='createParallel')
      && this.middlewares.every(mv => mv.name!=='createOrdered')) {
      return this._create(Lazy.ordered());
    }
    return this;
  }

  static ordered() {
    return function createOrdered({ next, active, }, execution) {
      const tasks = {};
      return {
        active,
        next: execution.ordered = async function applyOrdered(val, index, resolve) {
          if (active.call()) {
            if (resolve) {
              const runnables = entries(tasks)
                .sort((e1, e2) => e1[0] > e2[0] ? 1 : -1)
                .map((e) => e[1]);
              for (let i = 0; i < runnables.length; i++) {
                await runnables[i]();
                if (!active.call()) {
                  break;
                }
              }
            } else {
              tasks[index] = () => next(val, index);
            }
          }
        },
      };
    };
  }

  map(callback) {
    return this._create(Lazy.map(callback));
  }

  static map(mapper) {
    return function createMap({ next, active, }) {
      return {
        active,
        next: async function applyMap(val, index) {
          if (active.call()) {
            await next(await mapper(val), index);
          }
        },
      };
    };
  }

  resolve() {
    return this._create(Lazy.resolve());
  }

  static resolve() {
    return function createResolve({ next, active, }) {
      return {
        active,
        next: async function applyResolve(val, index) {
          if (active.call()) {
            await next(await val, index);
          }
        },
      };
    };
  }

  parallel() {
    if (this.middlewares.length) {
      throw new Error('Parallel must be first middleware of lazy operators');
    }
    return this._create(Lazy.parallel());
  }

  static parallel() {
    return function createParallel({ next, active, }, execution) {
      const tasks = [];
      execution.parallel = true;
      return {
        active,
        next: async function applyParallel(val, index) {
          if (active.call()) {
            tasks.push(next(val, index));
            if (execution.last) {
              await Promise.all(tasks);
              if (execution.ordered) {
                return await execution.ordered(undefined, undefined, true);
              }
            }
          }
        },
      };
    };
  }

  pick(...keys) {
    return this._create(Lazy.pick(keys));
  }

  static pick(keys) {
    const keySet = createSet(keys);
    return function createPick({ next, active, }) {
      return {
        active,
        next: async function applyPick(val, index) {
          if (active.call()) {
            val = entries(val)
              .filter(e => keySet[e[0]])
              .reduce(entriesToObject, {});
            await next(val, index);
          }
        },
      };
    };
  }

  distinctBy(picker = identity) {
    if (typeof picker === 'string') {
      const attribute= picker;
      picker = (val) => val[attribute];
    }
    return this._create(Lazy.distinctBy(picker));
  }

  static distinctBy(picker) {
    return function createDistinctBy({ next, active, }) {
      const history = {};
      return {
        active,
        next: async function applyDistinctBy(val, index) {
          const key = await picker(val);
          if (active.call() && !history[key]) {
            history[key] = true;
            await next(val, index);
          }
        },
      };
    };
  }

  filter(predicate = defaultFilter) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(Lazy.filter(predicate));
  }

  static filter(predicate) {
    return function createFilter({ active, next, }) {
      return {
        active,
        next: async function applyFilter(val, index) {
          if (active.call() && await predicate(val)) {
            await next(val, index);
          }
        },
      };
    };
  }

  every(predicate = defaultFilter) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(Lazy.every(predicate));
  }

  static every(predicate) {
    return function createEvery({ active, }, execution) {
      execution.result = true;
      active = active.concat(() => execution.result);
      return {
        active,
        next: async function applyEvery(val) {
          if (active.call()) {
            const result = !!await predicate(val);
            execution.result = result && execution.result;
          }
        },
      };
    };
  }

  some(predicate = defaultFilter) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(Lazy.some(predicate));
  }

  static some(predicate) {
    return function createSome({ active, }, execution) {
      execution.result = false;
      active = active.concat(() => !execution.result);
      return {
        active,
        next: async function applySome(val) {
          if (active.call()) {
            const result = !!await predicate(val);
            execution.result = execution.result || result;
          }
        },
      };
    };
  }

  takeUntil(predicate) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(Lazy.takeUntil(predicate));
  }

  static takeUntil(predicate) {
    return function createTakeUntil({ active, next, }) {
      let take = true;
      active = active.concat(() => take);
      return {
        active,
        next: async function applyTakeUntil(val, index) {
          if (active.call()) {
            if (!await predicate(val)) {
              take = false;
            } else if (active.call()) {
              await next(val, index);
            }
          }
        },
      };
    };
  }

  skipWhile(predicate) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(Lazy.skipWhile(predicate));
  }

  static skipWhile(predicate) {
    return function createSkipWhile({ active, next, }) {
      let take = false;
      return {
        active,
        next: async function applySkipWhile(val, index) {
          if (active.call() && (take || (take = !await predicate(val)))) {
            await next(val, index);
          }
        },
      };
    };
  }

  peek(callback) {
    return this._create(Lazy.peek(callback));
  }

  static peek(callback) {
    return function createPeek({ next, active, }) {
      return {
        active,
        next: async function applyPeek(val, index) {
          if (active.call()) {
            await callback(val, index);
            await next(val, index, false);
          }
        },
      };
    };
  }

  // NEVER CHANGE THE VALUE OF ACC
  scan(scanner = ((acc, next) => [ ...acc, next, ]), acc = undefined) {
    return this._create(Lazy.scan(scanner, acc));
  }

  static scan(scanner, acc) {
    return function createScan({ active, next, }) {
      let innerAcc = acc;
      let futures = [];
      return {
        active,
        next: async function applyScan(val, index) {
          if (active.call()) {
            futures.push((input) => scanner(input, val));
            if (futures.length===1) {
              for (let i = 0; i<futures.length; i++) {
                innerAcc = await futures[i](innerAcc);
                if (active.call()) {
                  await next(innerAcc, index);
                } else {
                  break;
                }
              }
              futures = [];
            }
          }
        },
      };
    };
  }

  take(max) {
    return this._create(Lazy.take(max));
  }

  static take(max) {
    return function createTake({ active, next, }) {
      let taken = 0;
      active = active.concat(() => taken < max);
      return {
        active,
        next: async function applyTake(val, index,) {
          if (active.call()) {
            taken++;
            await next(val, index,);
          }
        },
      };
    };
  }

  takeLast() {
    return this._create(Lazy.takeLast());
  }

  static takeLast() {
    return function createTakeLast({ active, }, execution) {
      return {
        active,
        next: async function applyTakeLast(val) {
          execution.result = val;
        },
      };
    };
  }

  sum() {
    return this._create(Lazy.sum());
  }

  static sum() {
    return function createSum({ active, }, execution) {
      execution.result = 0;
      return {
        active,
        next: async function applySum(val) {
          execution.result +=val;
        },
      };
    };
  }

  reduce(reducer = reduceToArray, acc) {
    return this._create(Lazy.reduce(reducer, acc));
  }

  static reduce(reducer, acc) {
    return function createReduce({ active, }, execution) {
      execution.result = acc;
      let futures = [];
      return {
        active,
        next: async function applyReduce(val, index) {
          futures.push((result) => reducer(result, val, index));
          if (futures.length===1) {
            for (let i = 0; i<futures.length; i++) {
              execution.result = await futures[i](execution.result);
            }
            futures = [];
          }
        },
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

function reduceToArray(acc = [], next) {
  return [ ...acc, next, ];
}

function createPropertyFilter(prop) {
  return function (val) {
    return !!val && val[prop];
  };
}

function identity(val) {
  return val;
}

function createSet(keys) {
  return values(keys)
    .reduce(function (acc, key) {
      acc[key] = true;
      return acc;
    }, {});
}

function entriesToObject(acc, e) {
  acc[e[0]] = e[1];
  return acc;
}