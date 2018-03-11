const createRace = require('./compositeRace');
const { createSkipWhileFilter,
    createTakeLimiter,
    createDistinctFilter,
    createDistinctByFilter,
    createOmitMapper,
    createPickMapper,
    createSkipFilter,
    createWhereFilter,
    createTakeUntilFilterResolver,
    createTakeWhileFilterResolver,
    createGetDelay,
    createGeneratorFromIterator, } = require('./utils');
/* eslint-disable consistent-return */
const { prepareAwait, prepareParallel,  prepareGenerator, prepareDelay,  } = require('./middlewares');
const { prepareCatch, prepareFilter,  prepareMap, prepareForEach, preparePreUpStreamFilter, preparePostUpstreamFilter, } = require('./emitterMiddlewares');

const ON_NEXT = Symbol('onNext');
const RETIRE = Symbol('retire');
const ORDER = Symbol('order');
class Emitter {

    static [ORDER]= -1;

    constructor (middlewares = []) {
        this._middlewares = middlewares;
        this.listen = this.listen.bind(this);
        this.retire = this.retire.bind(this);
        this.emit = this.emit.bind(this);
    }

    async listen () {
        const puller = await Emitter._createTail();
        const { onNext, retire, } = await this._createMiddlewares(puller);
        this[RETIRE] = retire;
        this[ON_NEXT] = onNext;
        return this;
    }

    retire () {
        this[RETIRE]();
    }

    async emit (value, scope = {}) {
        if (!this[ON_NEXT]) throw new Error('cannot emit values to emitters that are not listening');
        return this[ON_NEXT](value, [ Emitter[ORDER] = Emitter[ORDER]+1, ], scope);
    }

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
        const callback = createGetDelay(timingMs);
        return this._create({ operator: prepareDelay, callback, });
    }

    $delay (createTiming) {
        const callback = (value, scope) => (createGetDelay(createTiming(scope))());
        return this._create({ operator: prepareDelay, callback, });
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

    $generator (createProducer) {
        const callback = (value, scope) => createProducer(scope)(value);
        return this._create({ operator: prepareGenerator, callback, name: '$generator', });
    }

    flatten (iterator) {
        const callback = createGeneratorFromIterator(iterator);
        return this._create({ operator: prepareGenerator, callback, name: 'flatten', });
    }

    $flatten (createIterator) {
        const callback = (value, scope) => createIterator(scope)(createGeneratorFromIterator(value));
        return this._create({ operator: prepareGenerator, callback, name: '$flatten', });
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
    $map (createMapper = (scope) => () => scope) {
        const callback = (value, scope) => createMapper(scope)(value);
        return this._create({ operator: prepareMap, callback, name: '$map', });
    }
    pick (keys) {
        const callback = createPickMapper(keys);
        return this._create({ operator: prepareMap, callback, name: 'pick', });
    }
    $pick (createKeys) {
        const callback= (value, scope) => createOmitMapper(createKeys(scope));
        return this._create({ operator: prepareMap, callback, name: '$pick', });
    }
    omit (keys) {
        const callback= createOmitMapper(keys);
        return this._create({ operator: prepareMap, callback, name: 'omit', });
    }
    $omit (createKeys) {
        const callback= (value, scope) => createOmitMapper(createKeys(scope));
        return this._create({ operator: prepareMap, callback, name: '$omit', });
    }
    scan (scanner, acc = 0) {
        const callback= (value) => acc = scanner(acc, value);
        return this._create({ operator: prepareMap, callback, name: 'scan', });
    }

    $scan (createScanner, acc = 0) {
        const callback = (value, scope) => acc = createScanner(scope)(value, acc);
        return this._create({ operator: prepareMap, callback, name: '$scan', });
    }

    // filter
    filter (predicate= Boolean) {
        const callback = (value) => predicate(value);
        return this._create({ operator: prepareFilter, callback, });
    }
    $filter (createPredicate) {
        const callback = (value, scope) => createPredicate(scope)(value);
        return this._create({ operator: prepareFilter, callback, });
    }
    reject (predicate) {
        const callback = (value) => !predicate(value);
        return this._create({ operator: prepareFilter, callback, name: 'reject', });
    }
    $reject (scopePredicate) {
        const callback = (value, scope) => !scopePredicate(scope)(value);
        return this._create({ operator: prepareFilter, callback, name: 'reject', });
    }
    distinctBy (keys) {
        const callback = createDistinctByFilter(keys);
        return this._create({ operator: prepareFilter,  callback, name: 'distinctBy', });
    }
    $distinctBy (createKeys) {
        const callback = (value, scope) => createDistinctByFilter(createKeys(scope));
        return this._create({ operator: prepareFilter,  callback, name: 'distinctBy', });
    }
    where (obj) {
        const callback = createWhereFilter(obj);
        return this._create({ operator: prepareFilter, callback, name: 'where', });
    }
    $where (createObjectTemplate) {
        const callback = (value, scope) => createWhereFilter(createObjectTemplate(scope));
        return this._create({ operator: prepareFilter, callback, name: 'where', });
    }
    distinct () {
        const callback = createDistinctFilter();
        return this._create({ operator: prepareFilter, callback, name: 'distinct', });
    }
    skip (count = 0) {
        const callback = createSkipFilter(count);
        return this._create({ operator: prepareFilter, callback, name: 'skip', });
    }
    skipWhile (predicate) {
        const callback = createSkipWhileFilter(predicate);
        return this._create({ operator: prepareFilter, callback, name: 'skipWhile', });
    }

    // upStreamFilters
    takeWhile (predicate) {
        const callback = createTakeWhileFilterResolver(predicate);
        return this._create({ operator: preparePreUpStreamFilter, callback, name: 'takeWhile', });
    }
    takeUntil (predicate) {
        const callback = createTakeUntilFilterResolver(predicate);
        return this._create({ operator: preparePreUpStreamFilter, callback, name: 'takeUntil',  });
    }

    // postUpstreamFilters
    take (max) {
        const callback = createTakeLimiter(max);
        return this._create({ operator: preparePostUpstreamFilter, callback, name: 'take', });
    }

    // forEach
    forEach (callback) {
        return this._create({ operator: prepareForEach, callback: (value) => callback(value), });
    }

    $forEach (createCallback) {
        const callback = (value, scope) => createCallback(scope)(value);
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

    $catch (createCallback) {
        const callback = (value, scope) => createCallback(scope)(value);
        return this._create({ operator: prepareCatch, callback, name: '$catch', });
    }

    // parallel
    parallel (limit = NaN) {
        return this._create({ operator: prepareParallel, params: { limit, }, });
    }

    _create ({ operator, callback, params = {}, name, }) {
        const { _middlewares, [ON_NEXT]: onNext, } = this;
        if (onNext) throw new Error('Cannot extend initialized emitter');
        const index = _middlewares.length;
        const md = operator({ callback, params, name, index, emitter: true, });
        _middlewares.push(md);
        return this;
    }
}
module.exports = Emitter;
