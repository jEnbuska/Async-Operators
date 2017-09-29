/* eslint-disable no-return-assign,consistent-return,no-confusing-arrow */
/**
 * Created by joonaenbuska on 24/07/2017.
 */
import And, { returnTrue, } from './CompositeAnd';
import Or from './CompositeOr';

// Rename 'create' to 'create'
// 'create'/'create' should be parallel
// Replace log with peek with default value of 'log'. If string set as prefix of log
// Create pull (pull is catcher and completer) with CompositeOr of 'observed'
// Create next (put/push)
// upstreamActive --> Include any pullers
// Check sanity of middlewares on invoke
// middleware 'resolve' might be better of with returning the value instead of using callback
// test multiple create / (create)
// create memoLast, implements (onPull) with lastValue
// Create unObserve
// Create 'reject'

const NOT_SET = Symbol('NOT_SET');
const { entries, values, hasOwnProperty: has, } = Object;
export default function CreateLazy () {
  return new Lazy();
}

class Lazy {

  constructor (middlewares = [], activated) {
    this.middlewares = middlewares;
    this.activated = activated;
  }

  _create (operation) {
    return new Lazy([ ...this.middlewares, operation, ]);
  }

  async propose (...values) {
    if (!this.activated) {
      throw new Error('Invoking "propose" on non created instance of Lazy');
    }
    const [ tail, ] = this.middlewares;
    const { resolve, nextMiddleware, upStreamActive, }=  tail({ nextMiddleware: NOT_SET, });
    for (let i = 0; i<values.length && upStreamActive.call(); i++) {
      await nextMiddleware(values[i], [ i, ], And());
    }
    await resolve();
  }

  share () {
    const { middlewares, } = this;
    const followers = {};
    const stem = {
      followers,
      observed: Or(() => values(followers).some(follower => follower.observed.call())),
      upStreamActive: And(),
      resolve: async function sharedResolve () {
        await Promise.all(values(followers).filter(it => it.resolve).map(it => it.resolve()));
      },
      nextMiddleware: async function sharedNext (val, order, taskActive) {
        if (taskActive.call()) {
          await Promise.all(values(followers)
            .map(follower => follower.nextMiddleware(val, order, taskActive)));
        }
      },
    };
    const pipe = middlewares.slice().reverse().reduce((acc, middleware) => ({ ...acc, ...middleware(acc), }), stem);
    return new Lazy([ Lazy.share(pipe), ], true);
  }

  static share (stem) {
    let count = 0;
    return function useShared ({ upStreamActive, resolve, nextMiddleware, observed = Or(), }) {
      if (nextMiddleware!==NOT_SET) {
        stem.followers[count++] = { resolve, nextMiddleware, upStreamActive, observed, };
      }
      return {
        observed,
        upStreamActive: stem.upStreamActive,
        nextMiddleware: stem.nextMiddleware,
        resolve: stem.resolve,
      };
    };
  }

  pull (callbacks = {}) {
    const { onNext= emptyFunction, onResolve = emptyFunction, } = callbacks;
    const { middlewares, } = this;
    const observing = Or(returnTrue);
    const unObserve= () => observing.retire();
    let tail = {
      resolve: async function resolvePull () {
        await onResolve(unObserve);
      },
      observed: observing,
      upStreamActive: And(),
      nextMiddleware: async function invokePull (val, order, taskActive) {
        if (observing.call() && taskActive.call()) {
          onNext(val, unObserve);
        }
      },
    };
    middlewares.slice().reverse().reduce((acc, middleware) => ({ ...acc, ...middleware(acc), }), tail);
    return unObserve;
  }

  peek (callback = console.log) {
    if (typeof callback === 'string') {
      const prefix = callback;
      callback = val => console.log(`${prefix}:${val}`);
    }
    return this._create(Lazy.peek(callback));
  }

  static peek (callback) {
    return function createPeek ({ upStreamActive, nextMiddleware, observed = Or(), }) {
      return {
        nextMiddleware: function invokeCreate (val, order, taskActive) {
          if (observed.call() && taskActive.call() && upStreamActive.call()) {
            callback(val);
            return nextMiddleware(val, order, taskActive);
          }
        },
      };
    };
  }

  async push (...sources) {
    const { middlewares, } = this;
    let output = undefined;
    let pushResolver  = {
      observed: Or(returnTrue),
      upStreamActive: And(),
      resolve (result) {
        output = result;
      },
      nextMiddleware: NOT_SET,
    };
    const { upStreamActive, nextMiddleware, resolve, } = middlewares
      .slice()
      .reverse()
      .reduce((acc, middleware) => ({ ...acc, ...middleware(acc), }), pushResolver);
    for (let i = 0; i<sources.length && upStreamActive.call(); i++) {
      await nextMiddleware(sources[i], [ i, ], And());
    }
    await resolve();
    return output;
  }

  latestBy (selector) {
    if (typeof selector === 'string') {
      selector = createPropertySelector(selector);
    }
    return this._create(Lazy.latestBy(selector));
  }

  static latestBy (selector) {
    return function createLatestBy ({ nextMiddleware, upStreamActive, observed = Or(), }) {
      const previous = {};
      return {
        nextMiddleware: async function invokeLatestBy (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            const key = await selector(val);
            const selectorIdentity = previous[key] = has.call(previous, key) ? previous[key] + 1 : 0;
            await nextMiddleware(val, order, taskActive.concat(() => selectorIdentity === previous[key]));
          }
        },
      };
    };
  }

  debounceTime (ms) {
    return this._create(Lazy.debounceTime(ms));
  }

  static debounceTime (ms) {
    return function createDebounceTime ({ nextMiddleware, upStreamActive, observed, }) {
      let requests = 0;
      return {
        nextMiddleware: async function invokeDebounceTime (val, order, taskActive) {
          if (observed.call() && taskActive.call() && upStreamActive.call()) {
            const request = ++requests;
            await sleep(ms);
            if (request === requests && observed.call() && taskActive.call() && upStreamActive.call()) {
              await nextMiddleware(val, order, taskActive);
            }
          }
        },
      };
    };
  }

  ordered () {
    return this._create(Lazy.ordered());
  }

  static ordered () {
    return function createOrdered ({ nextMiddleware, upStreamActive, resolve, observed = Or(), }) {
      const tasks = {};
      return {
        resolve: async function resolveOrdered () {
          const runnables = entries(tasks)
            .sort((e1, e2) => orderComparator(e1[0], e2[0]))
            .map((e) => e[1]);
          for (let i = 0; i < runnables.length; i++) {
            await runnables[i]();
            if (!upStreamActive.call()) {
              break;
            }
          }
          if (resolve) {
            return resolve();
          }
        },
        nextMiddleware: async function invokeOrdered (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            tasks[order] = () => taskActive.call() && nextMiddleware(val, order, taskActive);
          }
        },
      };
    };
  }

  flatten (iterator = values) {
    return this._create(Lazy.flatten(iterator));
  }

  static flatten (iterator) {
    return function createFlatten ({ nextMiddleware, upStreamActive, observed = Or(), }) {
      return {
        nextMiddleware: async function invokeFlatten (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            const iterable = await iterator(val);
            let i = 0;
            for (const v of iterable) {
              if (observed.call() && upStreamActive.call() && taskActive.call()) {
                await nextMiddleware(v, [ ...order, i++, ], taskActive);
              } else {
                break;
              }
            }
          }
        },
      };
    };
  }

  takeWhile (predicate) {
    if (typeof predicate === 'string') {
      predicate= createPropertyFilter(predicate);
    }
    return this._create(Lazy.takeWhile(predicate));
  }

  static takeWhile (predicate) {
    return function createTakeWhile ({ upStreamActive, nextMiddleware, observed = Or(), }) {
      let take = true;
      upStreamActive = upStreamActive.concat(() => take);
      return {
        upStreamActive,
        nextMiddleware: async function invokeTakeWhile (val, order, taskActive) {
          if (take && (take = await predicate(val))) {
            if (observed.call() && upStreamActive.call() && taskActive.call()) {
              await nextMiddleware(val, order, taskActive);
            }
          }
        },
      };
    };
  }

  map (callback) {
    return this._create(Lazy.map(callback));
  }

  static map (mapper) {
    return function createMap ({ nextMiddleware, upStreamActive, observed = Or(),  }) {
      return {
        nextMiddleware: async function invokeMap (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            await nextMiddleware(await mapper(val), order, taskActive);
          }
        },
      };
    };
  }

  awaitResolved () {
    return this._create(Lazy.awaitResolved());
  }

  static awaitResolved () {
    return function createAwaitResolved ({ nextMiddleware, upStreamActive, observed = Or(), }) {
      return {
        nextMiddleware: async function invokeAwaitResolved (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            val = await val;
            await nextMiddleware(val, order, taskActive);
          }
        },
      };
    };
  }

  parallel () {
    return this._create(Lazy.parallel());
  }

  static parallel () {
    return function createParallel ({ nextMiddleware, upStreamActive, resolve, observed = Or(), }) {
      const tasks = [];
      return {
        resolve: async function resolveParallel () {
          await Promise.all(tasks);
          if (resolve) {
            await resolve();
          }
        },
        nextMiddleware: async function invokeParallel (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            tasks.push(nextMiddleware(val, order, taskActive));
          }
        },
      };
    };
  }

  skip (count) {
    return this._create(Lazy.skip(count));
  }

  static skip (count) {
    count = Number(count) || 0;
    return function createSkip ({ upStreamActive, nextMiddleware, observed = Or(), }) {
      let total = 0;
      return {
        nextMiddleware: async function invokeSkip (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            if (total>=count) {
              await nextMiddleware(val, order, taskActive);
            } else {
              total++;
            }
          }
        },
      };
    };
  }

  pick (...keys) {
    return this._create(Lazy.pick(keys));
  }

  static pick (keys) {
    const keySet = createSet(keys);
    return function createPick ({ nextMiddleware, upStreamActive, observed = Or(), }) {
      return {
        nextMiddleware: async function invokePick (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            val = entries(val)
              .filter(e => keySet[e[0]])
              .reduce(entriesToObject, {});
            await nextMiddleware(val, order, taskActive);
          }
        },
      };
    };
  }

  distinctBy (picker = identity) {
    if (typeof picker === 'string') {
      picker = createPropertySelector(picker);
    }
    return this._create(Lazy.distinctBy(picker));
  }

  static distinctBy (picker) {
    return function createDistinctBy ({ nextMiddleware, upStreamActive, observed = Or(), }) {
      const history = {};
      return {
        nextMiddleware: async function invokeDistinctBy (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            const key = await picker(val);
            if (!history[key]) {
              history[key] = true;
              await nextMiddleware(val, order, taskActive);
            }
          }
        },
      };
    };
  }

  filter (predicate = defaultFilter) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(Lazy.filter(predicate));
  }

  static filter (predicate) {
    return function createFilter ({ upStreamActive, nextMiddleware, observed = Or(), }) {
      return {
        nextMiddleware: async function invokeFilter (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call() && await predicate(val)) {
            await nextMiddleware(val, order, taskActive);
          }
        },
      };
    };
  }

  where (matcher) {
    return this._create(Lazy.where(matcher));
  }

  static where (matcher) {
    const matchEntries = entries(matcher);
    return function createWhere ({ upStreamActive, nextMiddleware, observed = Or(),  }) {
      return {
        nextMiddleware: async function invokeWhere (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            for (const e of matchEntries) {
              if (val[e[0]] !== e[1]) {
                return;
              }
            }
            await nextMiddleware(val, order, taskActive);
          }
        },
      };
    };
  }

  every (predicate = defaultFilter) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(Lazy.every(predicate));
  }

  static every (predicate) {
    return function createEvery ({ upStreamActive, resolve, observed = Or(),  }) {
      let output = true;
      upStreamActive = upStreamActive.concat(() => output);
      return {
        resolve: function resolveEvery () {
          resolve(output);
        },
        upStreamActive,
        nextMiddleware: async function invokeEvery (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            const result = !!await predicate(val);
            output = result && output;
          }
        },
      };
    };
  }

  some (predicate = defaultFilter) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(Lazy.some(predicate));
  }

  static some (predicate) {
    return function createSome ({ upStreamActive, resolve, observed = Or(),  }) {
      let output = false;
      upStreamActive = upStreamActive.concat(() => !output);
      return {
        upStreamActive,
        resolve: function resolveSome () {
          resolve(output);
        },
        nextMiddleware: async function invokeSome (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            const result = !!await predicate(val);
            output = result || output;
          }
        },
      };
    };
  }

  takeUntil (predicate) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(Lazy.takeUntil(predicate));
  }

  static takeUntil (predicate) {
    return function createTakeUntil ({ upStreamActive, nextMiddleware, observed = Or(), }) {
      let take = true;
      upStreamActive = upStreamActive.concat(() => take);
      return {
        upStreamActive,
        nextMiddleware: async function invokeTakeUntil (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            if (!await predicate(val)) {
              take = false;
            } else {
              await nextMiddleware(val, order, taskActive);
            }
          }
        },
      };
    };
  }

  skipWhile (predicate) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(Lazy.skipWhile(predicate));
  }

  static skipWhile (predicate) {
    return function createSkipWhile ({ upStreamActive, nextMiddleware, observed = Or(), }) {
      let take = false;
      return {
        nextMiddleware: async function invokeSkipWhile (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call() && (take || (take = !await predicate(val)))) {
            await nextMiddleware(val, order, taskActive);
          }
        },
      };
    };
  }

  // NEVER CHANGE THE VALUE OF ACC
  scan (scanner = ((acc, nextMiddleware) => [ ...acc, nextMiddleware, ]), acc = undefined) {
    return this._create(Lazy.scan(scanner, acc));
  }

  static scan (scanner, acc) {
    return function createScan ({ upStreamActive, nextMiddleware, observed = Or(), }) {
      let innerAcc = acc;
      let futures = [];
      return {
        nextMiddleware: async function invokeScan (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            futures.push(async (input) => {
              const result = await scanner(input, val);
              innerAcc = result;
              await nextMiddleware(result, order, taskActive);
            });
            if (futures.length===1) {
              for (let i = 0; i<futures.length; i++) {
                await futures[i](innerAcc);
                if (!observed.call() && upStreamActive.call() && taskActive.call()) {
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

  take (max) {
    return this._create(Lazy.take(max));
  }

  static take (max) {
    max = Number(max) || 0;
    return function createTake ({ upStreamActive, nextMiddleware, observed = Or(), }) {
      let taken = 0;
      upStreamActive = upStreamActive.concat(() => taken < max);
      return {
        upStreamActive,
        nextMiddleware: async function invokeTake (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            taken++;
            await nextMiddleware(val, order, taskActive);
          }
        },
      };
    };
  }

  takeLast (n) {
    return this._create(Lazy.takeLast(n));
  }

  static takeLast (n = 1) {
    return function createTakeLast ({ upStreamActive, resolve, observed = Or(), }) {
      const all = [];
      return {
        resolve: function resolveTakeLast () {
          resolve(all.slice(all.length-n, all.length));
        },
        nextMiddleware: async function invokeTakeLast (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            all.push(val);
          }
        },
      };
    };
  }

  sum () {
    return this._create(Lazy.sum());
  }

  static sum () {
    return function createSum ({ upStreamActive, resolve, observed = Or(), }) {
      let total = 0;
      return {
        resolve: function resolveSum () {
          resolve(total);
        },
        nextMiddleware: async function invokeSum (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            total +=val;
          }
        },
      };
    };
  }

  reduce (reducer = reduceToArray, acc) {
    return this._create(Lazy.reduce(reducer, acc));
  }

  static reduce (reducer, acc) {
    return function createReduce ({ upStreamActive, resolve, observed = Or(), }) {
      let output = acc;
      let futures = [];
      return {
        resolve: function resolveReduce () {
          return resolve(output);
        },
        nextMiddleware: async function invokeReduce (val, order, taskActive) {
          if (observed.call() && upStreamActive.call() && taskActive.call()) {
            futures.push((result) => reducer(result, val, order, taskActive));
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
  /*
    try(message){
      return this._create(Lazy.try(message))
    }

    static try(message){
      return function createTry({nextMiddleware, upStreamActive, catcher}){
        return {
          nextMiddleware: async function invokeTry(val, order, taskActive){
            let retries = 0;
            let retry = false;
            do{
             try{
               await nextMiddleware(val, order, taskActive)
             }catch (err){
               if(catcher && observed.call() && upStreamActive.call() && taskActive.call()){
                 const result = await catcher({message, val, err, retries});
                 retry = result.retry;
               }
             }
            }while(retry)
          }
        }
      }
    }

    catch(handler){
      return this._create(Lazy.catch(handler))
    }

    static catch(handler){
      return function createCatch({nextMiddleware, upStreamActive}){
        return {
          nextMiddleware: function(val, order, taskActive){ return nextMiddleware(val, order, taskActive) },
          catcher: async function invokeCatch(catchResult){
            if(observed.call() && upStreamActive.call() && taskActive.call()){
              return await handler(catchResult)
            }
            return {retry: false};
          }
        }
      }
    }*/
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

function defaultFilter (val) {
  return !!val;
}

function reduceToArray (acc = [], nextMiddleware) {
  return [ ...acc, nextMiddleware, ];
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

function emptyFunction () {

}

function sleep (ms) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve();
    }, ms);
  });
}