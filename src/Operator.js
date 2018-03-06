const createRace = require('./compositeRace');
const { createFirstEndResolver,
    orderComparator,
    createSkipWhileFilter,
    createObjectComparator,
    createSomeEndResolver,
    createEveryEndResolver,
    createTakeLimiter,
    createScanMapper,
    createSumReducer,
    createNegatePredicate,
    createDistinctFilter,
    createDistinctByFilter,
    createOmitMapper,
    createPickMapper,
    createCustomReducer,
    createMaxReducer,
    createMinReducer,
    createSkipFilter,
    createWhereFilter,
    createTakeUntilFilterResolver,
    createTakeWhileFilterResolver,
    defaultFilter,
    defaultComparator,
    createLatestTaskFilter,
    createGroupByReducer,
    createGeneratorFromIterator, } = require('./utils');
/* eslint-disable consistent-return */

const { $catch, $default, latest, $await, generator, repeat, filter, parallel, map, ordered, postUpstreamFilter, preUpStreamFilter, reduce, endReducer, delay, forEach, } = require('./middlewareCreators');

class Operator {

    constructor (middlewares = []) {
        this.middlewares = middlewares;
    }
    async pull (..._) {
        if (_.length) {
            throw new Error('"pull" should be called without parameters.');
        }
        let value;
        const { retire, ...rest }= await createRace();
        let puller  = {
            retire,
            ...rest,
            catcher (error, { index, name, value, }) {
                retire();
                throw new Error(JSON.stringify({ error, index, name, value, }, null, 1));
            },
            onValueResolved () {},
            async onComplete () {},
            onNext (val) {
                value = val;
            },
        };
        const { onComplete, } = await this._createMiddlewares(puller);
        return onComplete().then(() => value);
    }

    async _createMiddlewares (puller) {
        const { middlewares, } = this;
        let acc = puller;
        for (let i = middlewares.length-1; i>=0; i--) {
            const md = await middlewares[i](acc);
            acc = { ...acc, ...md, };
        }
        return acc;
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
        return this._create({ operator: reduce, params: { initReducer, }, });
    }

    groupBy (...keys) {
        const initReducer= () => ({
            reduce: createGroupByReducer(keys),
            defaultValue: {},
        });
        return this._create({ operator: reduce, name: 'groupBy', params: { initReducer, }, });
    }

    sum () {
        const initReducer = () => ({
            reduce: createSumReducer(),
            defaultValue: 0,
        });
        return this._create({ operator: reduce, name: 'sum', params: { initReducer, }, });
    }

    min (comparator = defaultComparator) {
        const initReducer  = () => ({
            reduce: createMinReducer(comparator),
            defaultValue: undefined,
        });
        return this._create({ operator: reduce, name: 'min', params: { initReducer, }, });
    }

    max (comparator = defaultComparator) {
        const initReducer  = () => ({
            reduce: createMaxReducer(comparator),
            defaultValue: undefined,
        });
        return this._create({ operator: reduce,  name: 'max', params: { initReducer, }, });
    }

    // generators
    generator (producer) {
        if (!producer || !producer.constructor && !producer.constructor.name.endsWith('GeneratorFunction')) {
            console.error('Invalid type passed to generator');
            const type = producer && producer.constructor ? producer.constructor.name : producer;
            console.error(type);
            throw new Error('generator middleware expect to be passed an Array, Function, GeneratorFunction or AsyncGeneratorFunction');
        }
        return this._create({ operator: generator, callback: producer, });
    }

    flatten (createArray) {
        const callback = createGeneratorFromIterator(createArray);
        return this._create({ operator: generator, callback, name: 'flatten', });
    }

    keys () {
        const callback = createGeneratorFromIterator(Object.keys);
        return this._create({ operator: generator, callback, name: 'keys', });
    }

    latestBy (...keys) {
        const callback = createLatestTaskFilter(keys);
        return this._create({ operator: latest, callback, name: 'latestBy', });
    }

    values () {
        const callback = createGeneratorFromIterator(Object.values);
        return this._create({ operator: generator, callback, name: 'values', });
    }

    entries () {
        const callback = createGeneratorFromIterator(Object.entries);
        return this._create({ operator: generator, callback, name: 'entries', });
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

    // map
    map (mapper) {
        const createCallback = () => mapper;
        return this._create({ operator: map, params: { createCallback, }, });
    }
    pick (...keys) {
        const createCallback = () => createPickMapper(keys);
        return this._create({ operator: map, params: { createCallback, }, name: 'pick', });
    }
    omit (...keys) {
        const createCallback = () => createOmitMapper(keys);
        return this._create({ operator: map, params: { createCallback, }, name: 'omit', });
    }
    // NEVER CHANGE THE VALUE OF ACC
    scan (scanner, acc = 0) {
        const createCallback = () => createScanMapper(scanner, acc);
        return this._create({ operator: map, name: 'scan', params: { createCallback, }, });
    }

    // filter
    filter (predicate = Boolean) {
        return this._create({ operator: filter, params: { initFilter: () => predicate, }, });
    }
    reject (predicate) {
        const initFilter= () => createNegatePredicate(predicate);
        return this._create({ operator: filter, name: 'reject', params: { initFilter, }, });
    }
    distinct () {
        const initFilter = () => createDistinctFilter();
        return this._create({ operator: filter, name: 'distinct', params: { initFilter, }, });
    }
    distinctBy (...params) {
        const initFilter = () => createDistinctByFilter(params);
        return this._create({ operator: filter,  name: 'distinctBy', params: { initFilter, }, });
    }
    skip (count = 0) {
        const initFilter= () => createSkipFilter(count);
        return this._create({ operator: filter, name: 'skip', params: { initFilter, }, });
    }
    where (obj) {
        const initFilter = () => createWhereFilter(obj);
        return this._create({ operator: filter, name: 'where', params: { initFilter, }, });
    }
    skipWhile (predicate) {
        const initFilter = () => createSkipWhileFilter(predicate);
        return this._create({ operator: filter, name: 'skipWhile', params: { initFilter, }, });
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

    // upStreamFilters
    takeWhile (predicate) {
        const createCallback = () => createTakeWhileFilterResolver(predicate);
        return this._create({ operator: preUpStreamFilter, name: 'takeWhile', params: { createCallback, }, });
    }
    takeUntil (predicate) {
        const createCallback = () => createTakeUntilFilterResolver(predicate);
        return this._create({ operator: preUpStreamFilter, name: 'takeUntil', params: { createCallback, }, });
    }

    // postUpstreamFilters
    take (max) {
        const createCallback = () => createTakeLimiter(max);
        return this._create({ operator: postUpstreamFilter, name: 'take', params: { createCallback, }, });
    }

    // repeaters
    repeatWhile (predicate, limit = 0) {
        return this._create({ operator: repeat, callback: predicate, name: 'repeatWhile', params: { limit, }, });
    }

    repeatUntil (predicate, limit = 0) {
        const negated = () => !predicate();
        return this._create({ operator: repeat, callback: negated, name: 'repeatUntil', params: { limit, }, });
    }

    // peekers
    forEach (callback) {
        return this._create({ operator: forEach, callback, });
    }

    // await
    await () {
        return this._create({ operator: $await, });
    }

    // default
    default (defaultValue) {
        return this._create({ operator: $default, params: { defaultValue, }, });
    }

    // parallel
    parallel (limit = NaN) {
        return this._create({ operator: parallel, params: { limit, }, });
    }

    // catcher
    catch (callback = (error, info) => console.error(JSON.stringify({ error, info, }, null, 1))) {
        return this._create({ operator: $catch, callback, });
    }

    _create ({ operator, callback, params = {}, name, }) {
        const index = this.middlewares.length;
        const md = operator({ callback, params, name, index, });
        return new Operator([ ...this.middlewares, md, ]);
    }
}
module.exports = Operator;
