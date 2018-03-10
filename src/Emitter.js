const createRace = require('./compositeRace');
const { createFirstEndResolver,
    createSkipWhileFilter,
    createTakeLimiter,
    createScanMapper,
    createNegatePredicate,
    createDistinctFilter,
    createDistinctByFilter,
    createOmitMapper,
    createPickMapper,
    createSkipFilter,
    createWhereFilter,
    createTakeUntilFilterResolver,
    createTakeWhileFilterResolver,
    createGeneratorFromIterator, } = require('./utils');
/* eslint-disable consistent-return */
const { map, filter, $catch, forEach, postUpstreamFilter, $await, parallel,  generator, preUpStreamFilter, endReducer, delay,  } = require('./middlewares');

class Emitter {

    static _order = -1;

    constructor (middlewares = []) {
        this.middlewares = middlewares;
    }

    async listen () {
        const puller = this._createTail();
        const { onNext, retire, } = await this._createMiddlewares(puller);
        this._onNext = onNext;
        return retire;
    }

    async emit (value) {
        if (!this._onNext) {
            throw new Error('cannot emit values to emitters that are not listening');
        }
        Emitter._order = Emitter._order+1;
        return this._onNext(value, [ Emitter._order, ]);
    }

    async _createTail () {
        const { retire, isActive, ...rest }= await createRace();
        return {
            ...rest,
            retire,
            isActive,
            async onComplete () {},
            onError (error, { index, name, value, }) {
                throw new Error(JSON.stringify({ error, index, name, value, }, null, 1));
            },
            onNext () {},
        };
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

    values () {
        const callback = createGeneratorFromIterator(Object.values);
        return this._create({ operator: generator, callback, name: 'values', });
    }

    entries () {
        const callback = createGeneratorFromIterator(Object.entries);
        return this._create({ operator: generator, callback, name: 'entries', });
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

    // peekers
    forEach (callback) {
        return this._create({ operator: forEach, callback, });
    }

    // await
    await () {
        return this._create({ operator: $await, });
    }

    // onError
    catch (callback = (error, info) => console.error(JSON.stringify({ error, info, }, null, 1))) {
        return this._create({ operator: $catch, callback, });
    }

    // parallel
    parallel (limit = NaN) {
        return this._create({ operator: parallel, params: { limit, }, });
    }

    _create ({ operator, callback, params = {}, name, }) {
        const index = this.middlewares.length;
        const md = operator({ callback, params, name, index, emitter: true, });
        return new Emitter([ ...this.middlewares, md, ]);
    }
}
module.exports = Emitter;
