/* eslint-disable no-return-assign,consistent-return,no-confusing-arrow */
/**
 * Created by joonaenbuska on 24/07/2017.
 */
import And, { returnTrue, } from './CompositeAnd';
import Or, { returnFalse, } from './CompositeOr';
import * as middlewareCreators from './middlewareCreators';
import { NOT_SET, values, createPropertyFilter, createPropertySelector, defaultFilter, identity, reduceToArray, entries, emptyFunction, } from './utils';

// Create onComplete --> onObserve on complete
// Check sanity of middlewares on invoke
// test multiple create / (create)
// create memoLast, implements (onPull) with lastValue
// Create 'reject'
// Create latestFrom
// test observe retire
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

  async propose (...vals) {
    const [ tail, ] = this.middlewares;
    const { resolve, nextMiddleware, upStreamActive, }=  tail({ nextMiddleware: emptyFunction, upStreamActive: Or(), observed: Or(returnFalse), });
    for (let i = 0; i<vals.length && upStreamActive.call(); i++) {
      await nextMiddleware(vals[i], [ i, ], And());
    }
    await resolve();
  }

  share () {
    const { middlewares, } = this;
    const followers = {};
    let completed = false;
    const stem = {
      followers,
      observed: Or(() => values(followers).some(follower => follower.observed.call())),
      upStreamActive: And(() => values(followers).some(follower => follower.upStreamActive.call())),
      onComplete: async function onCompleteShare () {
        completed = true;
      },
      resolve: async function sharedResolve () {
        const resolutions = [];
        for (const id in followers) {
          const { observed, resolve, } = followers[id];
          if (observed.call() && resolve) {
            resolutions.push(resolve());
          } else {
            delete followers[id];
          }
          await Promise.all(resolutions);
          if (completed) {
            for (const follower in followers) {
              await followers[follower].onComplete();
              delete followers[follower];
            }
          }
        }
      },
      nextMiddleware: async function sharedNext (val, order, taskActive) {
        if (taskActive.call()) {
          await Promise.all(values(followers)
            .map(follower => follower.nextMiddleware(val, order, taskActive)));
        }
      },
    };
    const pipe = middlewares.slice().reverse().reduce((acc, middleware) => ({ ...acc, ...middleware(acc), }), stem);
    return new Lazy([ middlewareCreators.share(pipe), ], true);
  }

  pull (callbacks = {}) {
    const { onNext = emptyFunction, onResolve = emptyFunction, onComplete = emptyFunction, } = callbacks;
    const { middlewares, } = this;
    let completed = false;
    const observed = Or(returnTrue);
    const retire = () => observed.retire();
    let tail = {
      onComplete: async function onCompletePull () {
        completed = true;
      },
      resolve: async function resolvePull () {
        if (onResolve && observed.call()) {
          await onResolve(retire);
        }
        if (completed && observed.call()) {
          retire();
          onComplete();
        }
      },
      observed,
      upStreamActive: And(),
      nextMiddleware: async function invokePull (val, order, taskActive) {
        if (onNext &&  observed.call() && taskActive.call()) {
          onNext(val, retire);
        }
      },
    };
    middlewares.slice().reverse().reduce((acc, middleware) => ({ ...acc, ...middleware(acc), }), tail);
    return retire;
  }

  peek (callback = console.log) {
    if (typeof callback === 'string') {
      const prefix = callback;
      callback = val => console.log(`${prefix}:${val}`);
    }
    return this._create(middlewareCreators.peek(callback));
  }

  async push (...sources) {
    const { middlewares, } = this;
    let output = undefined;
    const observed = Or(returnTrue);
    let pushResolver  = {
      observed,
      onComplete () {},
      upStreamActive: And(),
      resolve: function resolvePush () {},
      nextMiddleware: function invokePush (val) {
        output = val;
      },
    };
    const { upStreamActive, nextMiddleware, resolve, } = middlewares
      .slice()
      .reverse()
      .reduce((acc, middleware) => ({ ...acc, ...middleware(acc), }), pushResolver);
    for (let i = 0; i<sources.length && upStreamActive.call(); i++) {
      await nextMiddleware(sources[i], [ i, ], And(returnTrue));
    }
    await resolve();
    observed.retire();
    return output;
  }

  latestBy (selector) {
    if (typeof selector === 'string') {
      selector = createPropertySelector(selector);
    }
    return this._create(middlewareCreators.latestBy(selector));
  }

  debounceTime (ms) {
    return this._create(middlewareCreators.debounceTime(ms));
  }

  ordered () {
    return this._create(middlewareCreators.ordered());
  }

  flatten (iterator = values) {
    return this._create(middlewareCreators.flatten(iterator));
  }

  takeWhile (predicate) {
    if (typeof predicate === 'string') {
      predicate= createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.takeWhile(predicate));
  }

  takeUntil (predicate) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.takeUntil(predicate));
  }

  map (callback) {
    return this._create(middlewareCreators.map(callback));
  }

  awaitResolved () {
    return this._create(middlewareCreators.awaitResolved());
  }

  parallel () {
    return this._create(middlewareCreators.parallel());
  }

  skip (count) {
    return this._create(middlewareCreators.skip(count));
  }

  pick (...keys) {
    return this._create(middlewareCreators.pick(keys));
  }

  distinctBy (picker = identity) {
    if (typeof picker === 'string') {
      picker = createPropertySelector(picker);
    }
    return this._create(middlewareCreators.distinctBy(picker));
  }

  filter (predicate = defaultFilter) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.filter(predicate));
  }

  where (matcher) {
    return this._create(middlewareCreators.where(matcher));
  }

  every (predicate = defaultFilter) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.every(predicate));
  }

  some (predicate = defaultFilter) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.some(predicate));
  }

  skipWhile (predicate) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.skipWhile(predicate));
  }

  // NEVER CHANGE THE VALUE OF ACC
  scan (scanner = ((acc, nextMiddleware) => [ ...acc, nextMiddleware, ]), acc = undefined) {
    return this._create(middlewareCreators.scan(scanner, acc));
  }

  take (max) {
    return this._create(middlewareCreators.take(max));
  }

  takeLast (n) {
    return this._create(middlewareCreators.takeLast(n));
  }

  sum () {
    return this._create(middlewareCreators.sum());
  }

  reduce (reducer = reduceToArray, acc) {
    return this._create(middlewareCreators.reduce(reducer, acc));
  }

  /*
    try(message){
      return this._create(middlewareCreators.try(message))
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
      return this._create(middlewareCreators.catch(handler))
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
