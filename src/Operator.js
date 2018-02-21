const middlewareCreators = require('./middlewareCreators');
const And = require('./CompositeAnd');
const createRace = require('./CompositeRace');
const { createPropertyFilter, createKeySelector, createDistinctHistoryComparator, createPropertySelector, defaultFilter, identity, defaultComparator, createObjectComparator, comparatorError, createGrouper, createIntegerRange, } = require('./utils');
/* eslint-disable consistent-return */

class Operator {

    constructor (middlewares = []) {
        this.middlewares = middlewares;
    }

    async resolve (...sources) {
        let output = undefined;
        let pushResolver  = {
            ...await createRace(),
            async resolve () {},
            next (val) {
                output = val;
            },
        };
        const { isActive, next, resolve, } = await this._createMiddlewares(pushResolver);
        for (let i = 0; i<sources.length && isActive(); i++) next(sources[i], {}, [ i, ]);
        return resolve().then(() => output);
    }

    async consume (..._) {
        if (_.length) {
            throw new Error('consume should be called without parameters.');
        }
        let pushResolver  = {
            ...await createRace(),
            downStream: new And(),
            async resolve () {},
            next () {},
        };
        const { resolve, } = await this._createMiddlewares(pushResolver);
        return resolve();
    }

    async _createMiddlewares (tail) {
        const { middlewares, } = this;
        let acc = tail;
        for (let i = middlewares.length-1; i>=0; i--) {
            const md = await middlewares[i](acc);
            acc = { ...acc, ...md, };
        }
        return acc;
    }

    generator (producer, isSource) {
        if (!producer || !producer.constructor && !producer.constructor.name.endsWith('GeneratorFunction')) {
            console.error('Invalid type passed to generator');
            const type = producer && producer.constructor ? producer.constructor.name : producer;
            console.error(type);
            throw new Error('generator middleware expect to be passed a GeneratorFunction or AsyncGeneratorFunction');
        }
        return this._create(middlewareCreators.generator(producer, isSource));
    }

    delay (ms = 0) {
        if (Number.isInteger(ms)) {
            return this._create(middlewareCreators.delay(ms));
        } else {
            try {
                console.error({ ms, });
            } catch (e) {}
            throw new Error('Invalid delay passed to delay middleware');
        }
    }

    min (comparator = defaultComparator) {
        return this._create(middlewareCreators.min(comparator));
    }

    max (comparator = defaultComparator) {
        return this._create(middlewareCreators.max(comparator));
    }

    range (from, to) {
        const integerRange = createIntegerRange(from, to);
        return this.resolve(...integerRange);
    }

    forEach (callback) {
        return this._create(middlewareCreators.forEach(callback)).consume();
    }

    first () {
        return this._create(middlewareCreators.first());
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
            picker = createKeySelector(picker);
        }
        return this._create(middlewareCreators.toSet(picker));
    }

    toObject (picker = identity) {
        if (typeof picker=== 'string') {
            picker = createKeySelector(picker);
        }
        return this._create(middlewareCreators.toObject(picker));
    }

    toMap (picker = identity) {
        if (typeof picker=== 'string') {
            picker = createKeySelector(picker);
        }
        return this._create(middlewareCreators.toMap(picker));
    }

    reverse () {
        return this._create(middlewareCreators.reverse());
    }

    sort (...params) {
        const [ head, ] = params;
        const type = typeof head;
        if (type === 'undefined') {
            return this._create(middlewareCreators.sort(defaultComparator));
        } else if (type === 'function') {
            return this._create(middlewareCreators.sort(head));
        } else if (type === 'object') { // shape ~ {[propA]: 'DESC', [propB]: 'ASC'}
            return this._create(middlewareCreators.sort(createObjectComparator(head)));
        } else {
            throw comparatorError;
        }
    }

    await () {
        return this._create(middlewareCreators.await());
    }

    take (max) {
        return this._create(middlewareCreators.take(max));
    }

    sum (summer = identity) {
        if (typeof summer === 'string') {
            summer = createKeySelector(summer);
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

    distinctBy (...params) {
        let historyComparator;
        if (typeof params[0] === 'function') {
            throw new Error('Distinct by expected to be passed one or more keys as argument');
        } else {
            historyComparator = createDistinctHistoryComparator(params);
        }
        return this._create(middlewareCreators.distinctBy(historyComparator));
    }

    flatten (iterator = Object.values) {
        return this._create(middlewareCreators.flatten(iterator));
    }

    map (picker) {
        if (typeof picker === 'string') {
            picker = createKeySelector(picker);
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

    keep (picker = identity) { // this was probably a bad idea
        if (typeof picker === 'string') {
            const str = picker;
            picker = val => ({ [str]: val[str], });
        }
        return this._create(middlewareCreators.keep(picker));
    }

    _create (operation) {
        return new Operator([ ...this.middlewares, operation, ]);
    }
}
module.exports = Operator;
