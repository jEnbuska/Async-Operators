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
const { prepareAwait, prepareParallel,  prepareGenerator, prepareDelay,  } = require('./middlewares');
const { prepareCatch, prepareFilter,  prepareMap, prepareForEach, preparePreUpStreamFilter, preparePostUpstreamFilter, } = require('./emitterMiddlewares');

class Emitter {

    static _order = -1;

    constructor (middlewares = []) {
        this._middlewares = middlewares;
    }

    async listen () {
        const puller = await Emitter._createTail();
        const { onNext, retire, } = await this._createMiddlewares(puller);
        this._retire = retire;
        this._onNext = onNext;
        return this;
    }

    emit = async (value, scope) => {
        if (!this._onNext) {
            throw new Error('cannot emit values to emitters that are not listening');
        }
        Emitter._order = Emitter._order+1;
        return this._onNext(value, [ Emitter._order, ], scope);
    };

    static async _createTail () {
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
        const { _middlewares, } = this;
        let acc = puller;
        for (let i = _middlewares.length-1; i>=0; i--) {
            const md = await _middlewares[i](acc);
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
        return this._create({ operator: prepareDelay, params: { getDelay, }, });
    }

    // generators
    generator (producer) {
        if (!producer || !producer.constructor && !producer.constructor.name.endsWith('GeneratorFunction')) {
            console.error('Invalid type passed to generator');
            const type = producer && producer.constructor ? producer.constructor.name : producer;
            console.error(type);
            throw new Error('generator middleware expect to be passed an Array, Function, GeneratorFunction or AsyncGeneratorFunction');
        }
        return this._create({ operator: prepareGenerator, callback: producer, });
    }

    flatten (createArray) {
        const callback = createGeneratorFromIterator(createArray);
        return this._create({ operator: prepareGenerator, callback, name: 'flatten', });
    }

    keys () {
        const callback = createGeneratorFromIterator(Object.keys);
        return this._create({ operator: prepareGenerator, callback, name: 'keys', });
    }

    values () {
        const callback = createGeneratorFromIterator(Object.values);
        return this._create({ operator: prepareGenerator, callback, name: 'values', });
    }

    entries () {
        const callback = createGeneratorFromIterator(Object.entries);
        return this._create({ operator: prepareGenerator, callback, name: 'entries', });
    }

    // map
    map (callback) {
        return this._create({ operator: prepareMap, callback, });
    }
    $map (mapper) {
        const createCallback = () => mapper;
        return this._create({ operator: prepareMap, params: { createCallback, }, });
    }
    pick (...keys) {
        const callback = createPickMapper(keys);
        return this._create({ operator: prepareMap, callback, name: 'pick', });
    }
    omit (...keys) {
        const callback= createOmitMapper(keys);
        return this._create({ operator: prepareMap, callback, name: 'omit', });
    }
    // NEVER CHANGE THE VALUE OF ACC
    scan (scanner, acc = 0) {
        const callback= createScanMapper(scanner, acc);
        return this._create({ operator: prepareMap, callback, name: 'scan', });
    }

    // filter
    filter (callback= Boolean) {
        return this._create({ operator: prepareFilter, callback, });
    }

    reject (predicate) {
        const callback = createNegatePredicate(predicate);
        return this._create({ operator: prepareFilter, callback, name: 'reject', });
    }
    distinct () {
        const callback = createDistinctFilter();
        return this._create({ operator: prepareFilter, callback, name: 'distinct', });
    }
    distinctBy (...params) {
        const callback = createDistinctByFilter(params);
        return this._create({ operator: prepareFilter,  callback, name: 'distinctBy', });
    }
    skip (count = 0) {
        const callback = createSkipFilter(count);
        return this._create({ operator: prepareFilter, callback, name: 'skip', });
    }
    where (obj) {
        const callback = createWhereFilter(obj);
        return this._create({ operator: prepareFilter, callback, name: 'where', });
    }
    skipWhile (predicate) {
        const callback = createSkipWhileFilter(predicate);
        return this._create({ operator: prepareFilter, callback, name: 'skipWhile', });
    }

    // endReducer
    first () {
        const { callback, defaultValue, }= createFirstEndResolver();
        return this._create({ operator: endReducer, callback, params: { defaultValue, }, name: 'first', });
    }

    // upStreamFilters
    takeWhile (predicate) {
        const createCallback = () => createTakeWhileFilterResolver(predicate);
        return this._create({ operator: preparePreUpStreamFilter, name: 'takeWhile', params: { createCallback, }, });
    }
    takeUntil (predicate) {
        const createCallback = () => createTakeUntilFilterResolver(predicate);
        return this._create({ operator: preparePreUpStreamFilter, name: 'takeUntil', params: { createCallback, }, });
    }

    // postUpstreamFilters
    take (max) {
        const createCallback = () => createTakeLimiter(max);
        return this._create({ operator: preparePostUpstreamFilter, name: 'take', params: { createCallback, }, });
    }

    // peekers
    forEach (callback) {
        return this._create({ operator: prepareForEach, callback, });
    }

    // await
    await () {
        return this._create({ operator: prepareAwait, });
    }

    // onError
    catch (callback = (error, info) => console.error(JSON.stringify({ error, info, }, null, 1))) {
        return this._create({ operator: prepareCatch, callback, });
    }

    // parallel
    parallel (limit = NaN) {
        return this._create({ operator: prepareParallel, params: { limit, }, });
    }

    _create ({ operator, callback, params = {}, name, }) {
        const { _middlewares, } = this;
        const index = _middlewares.length;
        const md = operator({ callback, params, name, index, emitter: true, });
        return new Emitter([ ..._middlewares, md, ]);
    }
}
module.exports = Emitter;
