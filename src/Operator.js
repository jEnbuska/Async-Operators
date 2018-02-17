const middlewareCreators = require('./middlewareCreators');
const And = require('./CompositeAnd');
const { createPropertyFilter, createPropertySelector, defaultFilter, identity, defaultComparator, createComparator, comparatorError, createGrouper, } = require('./utils');
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
            resolve () {},
            next (val) {
                output = val;
                return true;
            },
        };
        const { active, next, resolve, } = middlewares
      .slice()
      .reverse()
      .reduce((acc, middleware) => ({ ...acc, ...middleware(acc), }), pushResolver);
        for (let i = 0; i<sources.length && active.call(); i++) {
            const output = next(sources[i], {}, [ i, ]);
            if (output && output instanceof Promise) {
                await output;
            }
        }
        await resolve();
        return output;
    }

    async consume (..._) {
        if (_.length) {
            throw new Error('consume should be called without parameters.');
        }
        const { middlewares, } = this;
        let output = undefined;
        let pushResolver  = {
            active: new And(),
            resolve () {},
            next () {
                return true;
            },
        };
        const { resolve, } = middlewares
            .slice()
            .reverse()
            .reduce((acc, middleware) => ({ ...acc, ...middleware(acc), }), pushResolver);
        console.log('created');
        await resolve();
        return output;
    }

    from (producer, isSource) {
        return this._create(middlewareCreators.from(producer, isSource));
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

    groupBy (...keys) {
        return this._create(middlewareCreators.groupBy(createGrouper(keys)));
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
        const type = typeof comparator;
        if (type === 'function') {
            return this._create(middlewareCreators.sort(comparator));
        } else if (type === 'object') { // shape ~ {[propA]: 'DESC', [propB]: 'ASC'}
            return this._create(middlewareCreators.sort(createComparator(comparator)));
        } else {
            throw comparatorError;
        }
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

    parallel (limit = 0) {
        return this._create(middlewareCreators.parallel(limit));
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
        console.log('create take until');
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

    _create (operation) {
        return new Operator([ ...this.middlewares, operation, ]);
    }
}
module.exports = Operator;
