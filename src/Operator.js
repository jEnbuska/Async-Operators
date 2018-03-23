const createRace = require('./compositeRace');
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
    createLastTaskFilter,
    createTakeLastFilter,
    createGroupByReducer,
    createSkipWhileFilter,
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
    createGeneratorFromIterator,
} = require('./utils');

/* eslint-disable consistent-return */
const {
    prepareCatch,
    prepareFilter,
    prepareMap,
    prepareForEach,
    preparePreUpStreamFilter,
    prepareTakeLimit,
    prepareReduce,
    prepareOrdered,
    prepareDefault,
    prepareLast,
    prepareReduceUntil,
    prepareAwait,
    prepareParallel,
    prepareGenerator,
    prepareDelay,  } = require('./middlewares');

class Operator  {

    static executions = 0;

    constructor (middlewares = []) {
        this._middlewares = middlewares;
    }

    async pull (..._) {
        if (_.length) {
            throw new Error('"pull" should be called without parameters.');
        }
        const tail = await Operator._createTail();
        let out;
        const ourHandle= Operator.executions++;
        const { onStart, onComplete, } = await this._createMiddlewares({
            ...tail,
            onNext (value, handle) {
                if (tail.isActive() && handle === ourHandle) {
                    out = value;
                }
            },
            onError (e, info) {
                console.error(JSON.stringify({ info, message: e.message, }, null, 1));
                throw e;
            },
            onStart () {},
        });

        await onStart(ourHandle, 'pull');
        try {
            return await onComplete(ourHandle, undefined, 'pull').then(() => out);
        } catch (e) {
            tail.resolve();
            throw e;
        }
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

    // reduce
    reduce (reducer, acc) {
        const callback = createCustomReducer(reducer);
        return this._create({ operator: prepareReduce, callback, params: { acc, }, });
    }
    $reduce (createReducer, acc) {
        const callback = (value, acc, scope) => createCustomReducer(scope)(value, acc);
        return this._create({ operator: prepareReduce, callback, params: { acc, }, });
    }
    groupBy (keys) {
        const callback = createGroupByReducer(keys);
        const acc = {};
        return this._create({ operator: prepareReduce, callback, name: 'groupBy', params: { acc, }, });
    }
    sum (accumulator= numb => numb) {
        const callback = createSumReducer(accumulator);
        const acc = 0;
        return this._create({ operator: prepareReduce, callback, name: 'sum', params: { acc, }, });
    }
    $sum (createAccumulator) {
        const callback = (value, scope) => createSumReducer(createAccumulator(scope))(value);
        const acc = 0;
        return this._create({ operator: prepareReduce, callback, name: '$sum', params: { acc, }, });
    }
    min (comparator = defaultComparator) {
        const callback = createMinReducer(comparator);
        const acc =  undefined;
        return this._create({ operator: prepareReduce, callback, name: 'min', params: { acc, }, });
    }
    $min (createComparator) {
        const callback = (value, scope) => createMinReducer(createComparator(scope))(value);
        const acc =  undefined;
        return this._create({ operator: prepareReduce, callback, name: '$min', params: { acc, }, });
    }
    max (comparator = defaultComparator) {
        const callback = createMaxReducer(comparator);
        const acc = undefined;
        return this._create({ operator: prepareReduce,  callback, name: 'max', params: { acc, }, });
    }
    $max (createComparator) {
        const callback = (value, scope) => createMaxReducer(createComparator(scope))(value);
        const acc = undefined;
        return this._create({ operator: prepareReduce,  callback, name: '$max', params: { acc, }, });
    }
    lastBy (keys) {
        const callback = createLastTaskFilter(keys);
        return this._create({ operator: prepareLast, callback, name: 'latestBy', });
    }
    last (max = 1) {
        const callback = createTakeLastFilter(max);
        return this._create({ operator: prepareLast, callback, name: 'latestBy', });
    }

    // ordered
    ordered () {
        const callback =(e1, e2) => orderComparator(e1[0], e2[0]);
        return this._create({ operator: prepareOrdered, callback, name: 'ordered', });
    }
    reverse () {
        const callback = ((e1, e2) => orderComparator(e1[0], e2[0])*-1);
        return this._create({ operator: prepareOrdered, callback, name: 'reverse', });
    }
    sort (comparator = defaultComparator) {
        const callback = (a, b) => comparator(a[1].value, b[1].value);
        return this._create({ operator: prepareOrdered, callback, name: 'sort', });
    }
    sortBy (obj) {
        const objectComparator= createObjectComparator(obj);
        const callback = (a, b) => objectComparator(a[1].value, b[1].value);
        return this._create({ operator: prepareOrdered, callback, name: 'sortBy', });
    }

    // endReducer
    first () {
        const { callback, defaultValue, } = createFirstEndResolver();
        return this._create({ operator: prepareReduceUntil, callback, params: { defaultValue, }, name: 'first', });
    }
    every (predicate = defaultFilter) {
        const { callback, defaultValue, } = createEveryEndResolver(predicate);
        return this._create({ operator: prepareReduceUntil, callback, params: { defaultValue, }, name: 'every', });
    }

    some (predicate = defaultFilter) {
        const { callback, defaultValue, } = createSomeEndResolver(predicate);
        return this._create({ operator: prepareReduceUntil, callback, params: { defaultValue, }, name: 'some', });
    }

    // default
    default (defaultValue) {
        return this._create({ operator: prepareDefault, params: { defaultValue, }, });
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
        return this._create({ operator: prepareTakeLimit, callback, name: 'take', });
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
        const { _middlewares, } = this;
        const index = _middlewares.length;
        const md = operator({ callback, params, name, index, });
        return new Operator([ ..._middlewares, md, ]);
    }

    static async _createTail () {
        const { resolve, isActive, ...rest }= await createRace();
        return {
            ...rest,
            resolve,
            isActive,
            async onComplete () {},
            onError (error, { index, name, value, }) {
                throw new Error(JSON.stringify({ error, index, name, value, }, null, 1));
            },
            onNext () {},
        };
    }
}
module.exports = Operator;
