const Emitter = require('./Emitter');
const { createFirstEndResolver,
    orderComparator,
    createObjectComparator,
    createSomeEndResolver,
    createEveryEndResolver,
    createSumReducer,
    createCustomReducer,
    createMaxReducer,
    createMinReducer,
    defaultFilter,
    defaultComparator,
    createLatestTaskFilter,
    createGroupByReducer, } = require('./utils');
/* eslint-disable consistent-return */

const { repeat, reducer, ordered, $default, latest, endReducer, delay,  } = require('./middlewares');

class Operator extends Emitter {

    listen () {
        throw new Error('Unsupported operation listen called on "Operator"');
    }
    emit () {
        throw new Error('Operators cannot emit values');
    }

    async pull (..._) {
        if (_.length) {
            throw new Error('"pull" should be called without parameters.');
        }
        const tail = await this._createTail();
        let out;
        const { onComplete, } = await this._createMiddlewares({
            ...tail,
            onNext (value) {
                if (tail.isActive()) {
                    out = value;
                }
            }, });
        try {
            return await onComplete().then(() => out);
        } catch (e) {
            tail.retire();
            throw e;
        }
    }

    // delays
    delay (timingMs = 0) {
        let getDelay;
        if (Number.isInteger(timingMs)) {
            getDelay =  () => timingMs;
        } else if (typeof timingMs === 'function') {
            getDelay = timingMs;
        } else {
            try {
                console.error({ ms: timingMs, });
            } catch (e) {}
            throw new Error('Invalid delay passed to delay middleware');
        }
        return this._create({ operator: delay, params: { getDelay, }, });
    }
    // reducers
    reduce (callback, seed) {
        const initReducer= () => ({
            reduce: createCustomReducer(callback),
            defaultValue: seed,
        });
        return this._create({ operator: reducer, params: { initReducer, }, });
    }

    groupBy (...keys) {
        const initReducer= () => ({
            reduce: createGroupByReducer(keys),
            defaultValue: {},
        });
        return this._create({ operator: reducer, name: 'groupBy', params: { initReducer, }, });
    }

    sum () {
        const initReducer = () => ({
            reduce: createSumReducer(),
            defaultValue: 0,
        });
        return this._create({ operator: reducer, name: 'sum', params: { initReducer, }, });
    }

    min (comparator = defaultComparator) {
        const initReducer  = () => ({
            reduce: createMinReducer(comparator),
            defaultValue: undefined,
        });
        return this._create({ operator: reducer, name: 'min', params: { initReducer, }, });
    }

    max (comparator = defaultComparator) {
        const initReducer  = () => ({
            reduce: createMaxReducer(comparator),
            defaultValue: undefined,
        });
        return this._create({ operator: reducer,  name: 'max', params: { initReducer, }, });
    }

    latestBy (...keys) {
        const callback = createLatestTaskFilter(keys);
        return this._create({ operator: latest, callback, name: 'latestBy', });
    }

    // orderers
    ordered () {
        const callback =(e1, e2) => orderComparator(e1[0], e2[0]);
        return this._create({ operator: ordered, callback, name: 'ordered', });
    }
    reverse () {
        const callback = ((e1, e2) => orderComparator(e1[0], e2[0])*-1);
        return this._create({ operator: ordered, callback, name: 'reverse', });
    }
    sort (comparator = defaultComparator) {
        const callback = (a, b) => comparator(a[1].val, b[1].val);
        return this._create({ operator: ordered, callback, name: 'sort', });
    }
    sortBy (obj) {
        const objectComparator= createObjectComparator(obj);
        const callback = (a, b) => objectComparator(a[1].val, b[1].val);
        return this._create({ operator: ordered, callback, name: 'sortBy', });
    }

    // endReducer
    first () {
        const { callback, defaultValue, }= createFirstEndResolver();
        return this._create({ operator: endReducer, callback, params: { defaultValue, }, name: 'first', });
    }
    every (predicate = defaultFilter) {
        const { callback, defaultValue, }= createEveryEndResolver(predicate);
        return this._create({ operator: endReducer, callback, params: { defaultValue, }, name: 'every', });
    }
    some (predicate = defaultFilter) {
        const { callback, defaultValue, }= createSomeEndResolver(predicate);
        return this._create({ operator: endReducer, callback, params: { defaultValue, }, name: 'some', });
    }

    // repeaters
    repeatWhile (predicate, limit = 0) {
        return this._create({ operator: repeat, callback: predicate, name: 'repeatWhile', params: { limit, }, });
    }

    repeatUntil (predicate, limit = 0) {
        const negated = () => !predicate();
        return this._create({ operator: repeat, callback: negated, name: 'repeatUntil', params: { limit, }, });
    }
    // default
    default (defaultValue) {
        return this._create({ operator: $default, params: { defaultValue, }, });
    }

    _create ({ operator, callback, params = {}, name, }) {
        const index = this.middlewares.length;
        const md = operator({ callback, params, name, index, });
        return new Operator([ ...this.middlewares, md, ]);
    }
}
module.exports = Operator;
