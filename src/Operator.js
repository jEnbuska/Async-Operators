import * as middlewareCreators from './middlewareCreators';
import And, { returnTrue, } from './CompositeAnd';
import { createPropertyFilter, createPropertySelector, defaultFilter, identity, reduceToArray, defaultComparator, } from './utils';
/* eslint-disable consistent-return */

export default function create () {
  return new Operator();
}

class Operator {

  constructor (middlewares = []) {
    this.middlewares = middlewares;
  }

  async invoke (...sources) {
    const { middlewares, } = this;
    let output = undefined;
    let pushResolver  = {
      upStreamActive: And(),
      resolve: function resolveInvoke () {},
      nextMiddleware: function invoke (val) {
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
    return output;
  }

  _create (operation) {
    return new Operator([ ...this.middlewares, operation, ]);
  }

  first () {
    return this._create(middlewareCreators.first());
  }

  keys () {
    return this._create(middlewareCreators.keys());
  }

  entries () {
    return this._create(middlewareCreators.entries());
  }

  values () {
    return this._create(middlewareCreators.values());
  }

  toArray () {
    return this._create(middlewareCreators.toArray());
  }

  toObjectSet (picker = identity) {
    if (typeof picker === 'string') {
      picker = createPropertySelector(picker);
    }
    return this._create(middlewareCreators.toObjectSet(picker));
  }

  toSet (picker = identity) {
    if (typeof picker === 'string') {
      picker = createPropertySelector(picker);
    }
    return this._create(middlewareCreators.toSet(picker));
  }

  toObject (picker = identity) {
    if (typeof picker=== 'string') {
      picker= createPropertySelector(picker);
    }
    return this._create(middlewareCreators.toObject(picker));
  }

  toMap (picker = identity) {
    if (typeof picker=== 'string') {
      picker= createPropertySelector(picker);
    }
    return this._create(middlewareCreators.toMap(picker));
  }

  reverse () {
    return this._create(middlewareCreators.reverse());
  }

  sort (comparator = defaultComparator) {
    return this._create(middlewareCreators.sort(comparator));
  }

  await (mapper = identity) {
    return this._create(middlewareCreators.await$(mapper));
  }

  take (max) {
    return this._create(middlewareCreators.take(max));
  }

  sum () {
    return this._create(middlewareCreators.sum());
  }

  where (matcher) {
    return this._create(middlewareCreators.where(matcher));
  }

  peek (callback = console.log) {
    if (typeof callback === 'string') {
      const prefix = callback;
      callback = val => console.log(`${prefix}:${val}`);
    }
    return this._create(middlewareCreators.peek(callback));
  }

  ordered () {
    return this._create(middlewareCreators.ordered());
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

  distinct () {
    return this._create(middlewareCreators.distinct());
  }

  distinctBy (picker) {
    if (typeof picker === 'string') {
      picker = createPropertySelector(picker);
    }
    return this._create(middlewareCreators.distinctBy(picker));
  }

  flatten (iterator = Object.values) {
    return this._create(middlewareCreators.flatten(iterator));
  }

  map (callback) {
    return this._create(middlewareCreators.map(callback));
  }

  filter (predicate = defaultFilter) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.filter(predicate));
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

  // NEVER CHANGE THE VALUE OF ACC
  scan (scanner, acc = 0) {
    return this._create(middlewareCreators.scan(scanner, acc));
  }

  reduce (reducer = reduceToArray, acc) {
    return this._create(middlewareCreators.reduce(reducer, acc));
  }

  takeWhile (predicate) {
    if (typeof predicate === 'string') {
      predicate= createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.takeWhile(predicate));
  }

  takeUntil (predicate) {
    const type = typeof predicate;
    if (type === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.takeUntil(predicate));
  }

  skipWhile (predicate) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.skipWhile(predicate));
  }
}