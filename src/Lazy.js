/* eslint-disable no-return-assign,consistent-return,no-confusing-arrow */
/**
 * Created by joonaenbuska on 24/07/2017.
 */
import And from './CompositeAnd';

// Create share
// Check sanity of middlewares on invoke
// Create flatten -> (index -> [i, j, k] ...)
// Create groupBy

const NOT_SET = Symbol('NOT_SET');
const { entries, values, hasOwnProperty: has, } = Object;
export default function () {
  return new Lazy();
}

class Lazy {

  static defaults = {
    createTakeLast: undefined,
    createTakeAll: [],
    createSum: 0,
    createTake: [],
    createReduce: [],
  };

  constructor(middlewares = []) {
    this.middlewares = middlewares;
  }

  _create(operation) {
    return new Lazy([ ...this.middlewares, operation, ]);
  }

  async invoke(...sources) {
    const { middlewares, } = this;
    let output = NOT_SET;
    let tail = { active: And(), resolve(result) { output = result; }, };
    for (let i = middlewares.length-1; i>=0; i--) {
      const { active = tail.active, resolve = tail.resolve, next, }= { ...middlewares[i](tail), };
      tail = { active, resolve, next, };
    }
    const { active, next, resolve, } = tail;
    for (let i = 0; i<sources.length && active.call(); i++) {
      await next(sources[i], [ i, ]);
    }
    await resolve();
    if (output=== NOT_SET) {
      return Lazy.defaults[middlewares[middlewares.length-1].name];
    }
    return output;
  }

  ordered() {
    if (this.middlewares.some(mv => mv.name==='createParallel')) {
      return this._create(Lazy.ordered());
    }
    return this;
  }

  static ordered() {
    return function createOrdered({ next, active, resolve, }) {
      const tasks = {};
      return {
        resolve: async function resolveOrdered() {
          const runnables = entries(tasks)
            .sort((e1, e2) => orderComparator(e1[0], e2[0]))
            .map((e) => e[1]);
          for (let i = 0; i < runnables.length; i++) {
            await runnables[i]();
            if (!active.call()) {
              break;
            }
          }
          return resolve();
        },
        next: async function applyOrdered(val, index) {
          if (active.call()) {
            tasks[index] = () => next(val, index);
          }
        },
      };
    };
  }

  flatten(iterator = values){
    return this._create(Lazy.flatten(iterator))
  }

  static flatten(iterator){
    return function createFlatten({next, active}){
      return {
        next: async function invokeFlatten (val, index){
          console.log('flatten ' )
          console.log(JSON.stringify(index))
          if(active.call()){
            const iterable = await iterator(val);
            let i = 0;
            for(const v of iterable){
              if(active.call()){
                await next(v, [...index, i++])
              }else{
                break;
              }
            }
          }
        }
      }
    }
  }

  takeWhile(predicate) {
    if (typeof predicate === 'string') {
      predicate= createPropertyFilter(predicate);
    }
    return this._create(Lazy.takeWhile(predicate));
  }

  static takeWhile(predicate) {
    return function createTakeWhile({ active, next, }) {
      let take = true;
      active = active.concat(() => take);
      return {
        active,
        next: async function applyTakeWhile(val, index) {
          if (take = (await predicate(val) && active.call())) {
            await next(val, index);
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
        next: async function applyResolve(val, index) {
          if (active.call()) {
            val = await val;
            await next(val, index);
          }
        },
      };
    };
  }

  parallel() {
    return this._create(Lazy.parallel());
  }

  static parallel() {
    return function createParallel({ next, active, resolve, }) {
      const tasks = [];
      return {
        resolve: async function resolveParallel() {
          await Promise.all(tasks);
          return resolve();
        },
        next: async function applyParallel(val, index) {
          if (active.call()) {
            tasks.push(next(val, index));
          }
        },
      };
    };
  }

  skip(count) {
    return this._create(Lazy.skip(count));
  }

  static skip(count) {
    count = Number(count) || 0;
    return function createSkip({ active, next, }) {
      let total = 0;
      return {
        next: async function applySkip(val, index) {
          if (active.call()) {
            if (total>=count) {
              await next(val, index);
            } else {
              total++;
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
        next: async function applyDistinctBy(val, index) {
          if (active.call()) {
            const key = await picker(val);
            if (!history[key]) {
              history[key] = true;
              await next(val, index);
            }
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
        next: async function applyFilter(val, index) {
          if (active.call() && await predicate(val)) {
            await next(val, index);
          }
        },
      };
    };
  }

  where(matcher) {
    return this._create(Lazy.where(matcher));
  }

  static where(matcher) {
    const matchEntries = entries(matcher);
    return function createWhere({ active, next, }) {
      return {
        next: async function applyWhere(val, index) {
          if (active.call()) {
            for (const e of matchEntries) {
              if (val[e[0]] !== e[1]) {
                return;
              }
            }
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
    return function createEvery({ active, resolve, }) {
      let output = true;
      active = active.concat(() => output);
      return {
        resolve: function resolveEvery() {
          resolve(output);
        },
        active,
        next: async function applyEvery(val) {
          if (active.call()) {
            const result = !!await predicate(val);
            output = result && output;
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
    return function createSome({ active, resolve, }) {
      let output = false;
      active = active.concat(() => !output);
      return {
        active,
        resolve: function resolveSome() { resolve(output); },
        next: async function applySome(val) {
          if (active.call()) {
            const result = !!await predicate(val);
            output = result || output;
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
            }else{
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
        next: async function applyScan(val, index) {
          if (active.call()) {
            futures.push(async (input) => {
              const result = await scanner(input, val);
              innerAcc = result;
              await next(result, index);
            });
            if (futures.length===1) {
              for (let i = 0; i<futures.length; i++) {
                await futures[i](innerAcc);
                if (!active.call()) {
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
    max = Number(max) || 0;
    return function createTake({ active, next, }) {
      let taken = 0;
      active = active.concat(() => taken < max);
      return {
        active,
        next: async function applyTake(val, index) {
          if (active.call()) {
            taken++;
            await next(val, index);
          }
        },
      };
    };
  }

  takeLast(n) {
    return this._create(Lazy.takeLast(n));
  }

  static takeLast(n = 1) {
    return function createTakeLast({ active, resolve, }) {
      const tail = [];
      return {
        resolve: function resolveTakeLast() {
          resolve(tail.slice(tail.length-n, tail.length));
        },
        next: async function applyTakeLast(val) {
          if (active.call()) {
            tail.push(val);
          }
        },
      };
    };
  }

  sum() {
    return this._create(Lazy.sum());
  }

  static sum() {
    return function createSum({ active, resolve, }) {
      let total = 0;
      return {
        resolve: function resolveSum() { resolve(total); },
        next: async function applySum(val) {
          if (active.call()) {
            total +=val;
          }
        },
      };
    };
  }

  reduce(reducer = reduceToArray, acc) {
    return this._create(Lazy.reduce(reducer, acc));
  }

  static reduce(reducer, acc) {
    return function createReduce({ active, resolve, }) {
      let output = acc;
      let futures = [];
      return {
        resolve: function resolveReduce() { return resolve(output); },
        next: async function applyReduce(val, index) {
          if (active.call()) {
            futures.push((result) => reducer(result, val, index));
            if (futures.length===1) {
              for (let i = 0; i<futures.length; i++) {
                output = await futures[i](output);
              }
              futures = [];
            }
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

function orderComparator(a, b) {
  const { length, } = a;
  for (let i = 0; i<length; i++) {
    const diff = a[i]-b[i];
    if (diff) {
      return diff;
    }
  }
  return 0;
}