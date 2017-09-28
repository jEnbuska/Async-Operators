/* eslint-disable no-return-assign,consistent-return,no-confusing-arrow */
/**
 * Created by joonaenbuska on 24/07/2017.
 */
import And from './CompositeAnd';

// Create pull (pull is catcher and completer)
// Create put
// upstreamActive --> Include any pullers
// Rename resolve to await -> create resolve (final block like reduce or sum)
// Check sanity of middlewares on invoke
// middleware 'resolve' might be better of with returning the value instead of using callback
// Create groupBy
// test multiple share

const NOT_SET = Symbol('NOT_SET');
const { entries, values, hasOwnProperty: has, } = Object;
export default function CreateLazy () {
  return new Lazy();
}

class Lazy {

  constructor (middlewares = []) {
    this.middlewares = middlewares;
  }

  _create (operation) {
    return new Lazy([ ...this.middlewares, operation, ]);
  }

  share () {
    const { middlewares, } = this;
    const followers = {};
    let tail = {
      upStreamActive: And(),
      resolve: async function sharedResolve () {
        for (const nextMiddleware of values(followers)) {
          if (nextMiddleware.resolve) {
            await nextMiddleware.resolve();
          }
        }
      },
      nextMiddleware: async function sharedNext (val, order, taskActive) {
        if (taskActive.call())
          for (const follower of values(followers)) {
            await follower.nextMiddleware(val, order, taskActive);
          }
      },
    };
    for (let i = middlewares.length-1; i>=0; i--) {
      const { upStreamActive = tail.upStreamActive, resolve = tail.resolve, nextMiddleware = tail.nextMiddleware, } = { ...middlewares[i](tail), };
      tail = { upStreamActive, resolve, nextMiddleware, };
    }
    const { upStreamActive, nextMiddleware, resolve, } = tail;
    return new Lazy([ Lazy.share({ upStreamActive, nextMiddleware, resolve, followers, }), ]);
  }

  static share (stem) {
    let count = 0;
    return function createShare ({ upStreamActive, resolve, nextMiddleware, }) {
      stem.followers[count++] = { resolve, nextMiddleware, upStreamActive, };
      return {
        upStreamActive,
        nextMiddleware: stem.nextMiddleware,
        resolve: stem.resolve,
      };
    };
  }

  conclude (callback) {
    this._create(Lazy.conclude(callback));
  }

  static conclude (callback) {
    return function createConclude ({ next, }) {
      return {

      };
    };
  }

  log (prefix, logger = console.log) {
    return this._create(Lazy.log(prefix, logger));
  }

  static log (prefix, logger) {
    return function createLog ({ nextMiddleware, }) {
      return {
        nextMiddleware: function invokeLog (val, order, taskActive) {
          logger(`${prefix}: ${val}`);
          return nextMiddleware(val, order, taskActive);
        },
      };
    };
  }

  async invoke (...sources) {
    const { middlewares, } = this;
    let output = NOT_SET;
    let tail = { upStreamActive: And(), resolve (result) {
      output = result;
    }, };
    for (let i = middlewares.length-1; i>=0; i--) {
      const { upStreamActive = tail.upStreamActive, resolve = tail.resolve, nextMiddleware = tail.nextMiddleware, } = middlewares[i](tail);
      tail = { upStreamActive, resolve, nextMiddleware, };
    }
    const { upStreamActive, nextMiddleware, resolve, } = tail;
    for (let i = 0; i<sources.length && upStreamActive.call(); i++) {
      await nextMiddleware(sources[i], [ i, ], And(returnTrue));
    }
    await resolve();
    if (output=== NOT_SET) {
      return Lazy.defaults[middlewares[middlewares.length-1].name];
    }
    return output;
  }

  latestBy (selector) {
    if (typeof selector === 'string') {
      selector = createPropertySelector(selector);
    }
    return this._create(Lazy.latestBy(selector));
  }

  static latestBy (selector) {
    return function createLatestBy ({ nextMiddleware, upStreamActive, }) {
      const previous = {};
      return {
        nextMiddleware: async function invokeLatestBy (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
            const key = await selector(val);
            const selectorIdentity = previous[key] = has.call(previous, key) ? previous[key] + 1 : 0;
            await nextMiddleware(val, order, taskActive.concat(() => selectorIdentity === previous[key]));
          }
        },
      };
    };
  }

  ordered () {
    if (this.middlewares.some(mv => mv.name==='createParallel')) {
      return this._create(Lazy.ordered());
    }
    return this;
  }

  static ordered () {
    return function createOrdered ({ nextMiddleware, upStreamActive, resolve, }) {
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
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createFlatten ({ nextMiddleware, upStreamActive, }) {
      return {
        nextMiddleware: async function invokeFlatten (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {

            const iterable = await iterator(val);
            let i = 0;
            for (const v of iterable) {
              if (upStreamActive.call() && taskActive.call()) {
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
    return function createTakeWhile ({ upStreamActive, nextMiddleware, }) {
      let take = true;
      upStreamActive = upStreamActive.concat(() => take);
      return {
        upStreamActive,
        nextMiddleware: async function invokeTakeWhile (val, order, taskActive) {
          if (take = (await predicate(val) && upStreamActive.call() && taskActive.call())) {
            await nextMiddleware(val, order, taskActive);
          }
        },
      };
    };
  }

  map (callback) {
    return this._create(Lazy.map(callback));
  }

  static map (mapper) {
    return function createMap ({ nextMiddleware, upStreamActive, }) {
      return {
        nextMiddleware: async function invokeMap (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createAwaitResolved ({ nextMiddleware, upStreamActive, }) {
      return {
        nextMiddleware: async function invokeAwaitResolved (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createParallel ({ nextMiddleware, upStreamActive, resolve, }) {
      const tasks = [];
      return {
        resolve: async function resolveParallel () {
          await Promise.all(tasks);
          if (resolve) {
            return resolve();
          }
        },
        nextMiddleware: async function invokeParallel (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createSkip ({ upStreamActive, nextMiddleware, }) {
      let total = 0;
      return {
        nextMiddleware: async function invokeSkip (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createPick ({ nextMiddleware, upStreamActive, }) {
      return {
        nextMiddleware: async function invokePick (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createDistinctBy ({ nextMiddleware, upStreamActive, }) {
      const history = {};
      return {
        nextMiddleware: async function invokeDistinctBy (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createFilter ({ upStreamActive, nextMiddleware, }) {
      return {
        nextMiddleware: async function invokeFilter (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call() && await predicate(val)) {
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
    return function createWhere ({ upStreamActive, nextMiddleware, }) {
      return {
        nextMiddleware: async function invokeWhere (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createEvery ({ upStreamActive, resolve, }) {
      let output = true;
      upStreamActive = upStreamActive.concat(() => output);
      return {
        resolve: function resolveEvery () {
          resolve(output);
        },
        upStreamActive,
        nextMiddleware: async function invokeEvery (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createSome ({ upStreamActive, resolve, }) {
      let output = false;
      upStreamActive = upStreamActive.concat(() => !output);
      return {
        upStreamActive,
        resolve: function resolveSome () {
          resolve(output);
        },
        nextMiddleware: async function invokeSome (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createTakeUntil ({ upStreamActive, nextMiddleware, }) {
      let take = true;
      upStreamActive = upStreamActive.concat(() => take);
      return {
        upStreamActive,
        nextMiddleware: async function invokeTakeUntil (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createSkipWhile ({ upStreamActive, nextMiddleware, }) {
      let take = false;
      return {
        nextMiddleware: async function invokeSkipWhile (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call() && (take || (take = !await predicate(val)))) {
            await nextMiddleware(val, order, taskActive);
          }
        },
      };
    };
  }

  peek (callback) {
    return this._create(Lazy.peek(callback));
  }

  static peek (callback) {
    return function createPeek ({ nextMiddleware, upStreamActive, }) {
      return {
        nextMiddleware: async function invokePeek (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
            await callback(val);
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
    return function createScan ({ upStreamActive, nextMiddleware, }) {
      let innerAcc = acc;
      let futures = [];
      return {
        nextMiddleware: async function invokeScan (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
            futures.push(async (input) => {
              const result = await scanner(input, val);
              innerAcc = result;
              await nextMiddleware(result, order, taskActive);
            });
            if (futures.length===1) {
              for (let i = 0; i<futures.length; i++) {
                await futures[i](innerAcc);
                if (!upStreamActive.call() && taskActive.call()) {
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
    return function createTake ({ upStreamActive, nextMiddleware, }) {
      let taken = 0;
      upStreamActive = upStreamActive.concat(() => taken < max);
      return {
        upStreamActive,
        nextMiddleware: async function invokeTake (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createTakeLast ({ upStreamActive, resolve, }) {
      const all = [];
      return {
        resolve: function resolveTakeLast () {
          resolve(all.slice(all.length-n, all.length));
        },
        nextMiddleware: async function invokeTakeLast (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createSum ({ upStreamActive, resolve, }) {
      let total = 0;
      return {
        resolve: function resolveSum () {
          resolve(total);
        },
        nextMiddleware: async function invokeSum (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
    return function createReduce ({ upStreamActive, resolve, }) {
      let output = acc;
      let futures = [];
      return {
        resolve: function resolveReduce () {
          return resolve(output);
        },
        nextMiddleware: async function invokeReduce (val, order, taskActive) {
          if (upStreamActive.call() && taskActive.call()) {
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
               if(catcher && upStreamActive.call() && taskActive.call()){
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
            if(upStreamActive.call() && taskActive.call()){
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

function returnFalse () {
  return false;
}

function returnTrue () {
  return true;
}