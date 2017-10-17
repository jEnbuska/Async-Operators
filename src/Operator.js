const middlewareCreators = require('./middlewareCreators');
const And = require('./CompositeAnd');
const { createPropertyFilter, createPropertySelector, defaultFilter, identity, defaultComparator, createComparator, createCompositeComparator, } = require('./utils');
/* eslint-disable consistent-return */

class Operator {

  constructor (middlewares = []) {
    this.middlewares = middlewares;
  }

  async resolve (...sources) {
    const { middlewares, } = this;
    let output = undefined;
    let pushResolver  = {
      active: new And(),
      resolve: function resolveInvoke () {},
      next: function invoke (val) {
        output = val;
      },
    };
    const { active, next, resolve, } = middlewares
      .slice()
      .reverse()
      .reduce((acc, middleware) => ({ ...acc, ...middleware(acc), }), pushResolver);
    for (let i = 0; i<sources.length && active.call(); i++) {
      await next(sources[i], {}, [ i, ]);
    }
    await resolve();
    return output;
  }

  min (comparator = defaultComparator) {
    return this._create(middlewareCreators.min(comparator));
  }

  max (comparator = defaultComparator) {
    return this._create(middlewareCreators.max(comparator));
  }

  range (from, to) {
    const sources = [];
    if (from<to) {
      for (let i = from; i<to; i++) {
        sources.push(i);
      }
    } else {
      for (let i = from; i>to; i--) {
        sources.push(i);
      }
    }
    return this.resolve(...sources);
  }

  _create (operation) {
    return new Operator([ ...this.middlewares, operation, ]);
  }

  first () {
    return this._create(middlewareCreators.first());
  }

  keep (picker = identity) {
    if (typeof picker === 'string') {
      const str = picker;
      picker = val => ({ [str]: val[str], });
    }
    return this._create(middlewareCreators.keep(picker));
  }

  keys () {
    return this._create(middlewareCreators.flatten(Object.keys));
  }

  entries () {
    return this._create(middlewareCreators.flatten(Object.entries));
  }

  values () {
    return this._create(middlewareCreators.flatten(Object.values));
  }

  toArray () {
    return this._create(middlewareCreators.toArray());
  }

  groupBy (callback) {
    if (typeof callback === 'string') {
      callback = createPropertySelector(callback);
    }
    return this._create(middlewareCreators.groupBy(callback));
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

  sort (comparator = defaultComparator, ...rest) {
    const comparators = [ comparator, ...rest, ];
    for (let i = 0; i<comparators.length; i++) {
      if (typeof comparators[i] !== 'function') {
        comparators[i] = createComparator(comparators[i]);
      }
    }
    return this._create(middlewareCreators.sort(createCompositeComparator(comparators)));
  }

  await (mapper = identity) {
    return this._create(middlewareCreators.await(mapper));
  }

  take (max) {
    return this._create(middlewareCreators.take(max));
  }

  sum (summer = identity) {
    if (typeof summer === 'string') {
      summer = createPropertySelector(summer);
    }
    return this._create(middlewareCreators.sum(summer));
  }

  where (matcher) {
    return this._create(middlewareCreators.where(matcher));
  }

  default (defaultValue) {
    return this._create(middlewareCreators.default(defaultValue));
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

  omit (...keys) {
    return this._create(middlewareCreators.omit(keys));
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

  map (picker) {
    if (typeof picker === 'string') {
      picker = createPropertySelector(picker);
    }
    return this._create(middlewareCreators.map(picker));
  }

  filter (predicate = defaultFilter) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.filter(predicate));
  }

  reject (predicate) {
    if (typeof predicate === 'string') {
      predicate = createPropertyFilter(predicate);
    }
    return this._create(middlewareCreators.reject(predicate));
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

  reduce (reducer, acc) {
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
module.exports = Operator;