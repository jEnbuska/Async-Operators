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
    createTakeLastByFilter,
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
    createLatestByCanceller,
    createLatestCanceller,
    createMiddlewares,
    INDEX,
    MIDDLEWARES,
    CREATE
} = require('./utils');

/* eslint-disable consistent-return */
const {
    catch$,
    filter$,
    map$,
    fap$,
    forEach$,
    preUpStreamFilter$,
    takeLimit$,
    reduce$,
    ordered$,
    default$,
    last$,
    reduceUntil$,
    await$,
    parallel$,
    generator$,
    downStreamFilter$,
    delay$,  } = require('./middlewares');

class Operator  {

    static executions = 0;
    constructor (middlewares = [], index = 0) {
        this[MIDDLEWARES] = middlewares;
        this[INDEX]= index;
    }

    async pull (..._) {
        if (_.length) {
            throw new Error('"pull" should be called without parameters.');
        }
        let out;
        const executionHandle= Operator.executions++;
        let { [MIDDLEWARES]: middlewares, } = this;
        const tail = await createRace();
        const { onStart, onComplete, } = await createMiddlewares([ ...middlewares,
            {
                ...tail,
                async onComplete () {},
                onError (e, info) {
                    console.error(JSON.stringify({ info, message: e.message, }, null, 1));
                    throw e;
                },
                onNext ({ value, handle, upStream, }) {
                    if (upStream.isActive() && handle === executionHandle) out = value;
                },
                onStart () {},
            },
        ]);
        await onStart(executionHandle, 'pull');
        const upStream = await createRace();
        try {
            await onComplete(executionHandle, upStream, 'pull');
            return out;
        } catch (e) {
            tail.resolve();
            throw e;
        }
    }

    // reduce
    reduce (reducer, acc) {
        const callback = createCustomReducer(reducer);
        return this[CREATE]({ operator: reduce$, callback, params: { acc, }, });
    }

    reduce_ (createReducer, acc) {
        const callback = (value, acc, scope) => createCustomReducer(scope)(value, acc);
        return this[CREATE]({ operator: reduce$, callback, params: { acc, }, name: 'reduce_', });
    }
    groupBy (keys) {
        const callback = createGroupByReducer(keys);
        const acc = {};
        return this[CREATE]({ operator: reduce$, callback, name: 'groupBy', params: { acc, }, });
    }
    sum (accumulator= numb => numb, acc = 0) {
        const callback = createSumReducer(accumulator);
        return this[CREATE]({ operator: reduce$, callback, name: 'sum', params: { acc, }, });
    }
    sum_ (createAccumulator, acc = 0) {
        const callback = (value, scope) => createSumReducer(createAccumulator(scope))(value);
        return this[CREATE]({ operator: reduce$, callback, name: 'sum_', params: { acc, }, });
    }
    min (comparator = defaultComparator) {
        const callback = createMinReducer(comparator);
        const acc =  undefined;
        return this[CREATE]({ operator: reduce$, callback, name: 'min', params: { acc, }, });
    }
    min_ (createComparator) {
        const callback = (value, scope) => createMinReducer(createComparator(scope))(value);
        const acc =  undefined;
        return this[CREATE]({ operator: reduce$, callback, name: 'min_', params: { acc, }, });
    }
    max (comparator = defaultComparator) {
        const callback = createMaxReducer(comparator);
        const acc = undefined;
        return this[CREATE]({ operator: reduce$,  callback, name: 'max', params: { acc, }, });
    }
    max_ (createComparator) {
        const callback = (value, scope) => createMaxReducer(createComparator(scope))(value);
        const acc = undefined;
        return this[CREATE]({ operator: reduce$,  callback, name: 'max_', params: { acc, }, });
    }
    lastBy (keys) {
        const callback = createTakeLastByFilter(keys);
        return this[CREATE]({ operator: last$, callback, name: 'lastBy', });
    }
    last (max = 1) {
        const callback = createTakeLastFilter(max);
        return this[CREATE]({ operator: last$, callback, name: 'last', });
    }

    // ordered
    ordered () {
        const callback =(a, b) => orderComparator(a.order, b.order);
        return this[CREATE]({ operator: ordered$, callback, name: 'ordered', });
    }
    reverse () {
        const callback = ((a, b) => orderComparator(a.order, b.order)*-1);
        return this[CREATE]({ operator: ordered$, callback, name: 'reverse', });
    }
    sort (comparator = defaultComparator) {
        const callback = (a, b) => comparator(a.value, b.value);
        return this[CREATE]({ operator: ordered$, callback, name: 'sort', });
    }
    sortBy (obj) {
        const objectComparator= createObjectComparator(obj);
        const callback = (a, b) => objectComparator(a.value, b.value);
        return this[CREATE]({ operator: ordered$, callback, name: 'sortBy', });
    }

    // endReducer
    first () {
        const { callback, defaultValue, } = createFirstEndResolver();
        return this[CREATE]({ operator: reduceUntil$, callback, params: { defaultValue, }, name: 'first', });
    }
    every (predicate = defaultFilter) {
        const { callback, defaultValue, } = createEveryEndResolver(predicate);
        return this[CREATE]({ operator: reduceUntil$, callback, params: { defaultValue, }, name: 'every', });
    }

    some (predicate = defaultFilter) {
        const { callback, defaultValue, } = createSomeEndResolver(predicate);
        return this[CREATE]({ operator: reduceUntil$, callback, params: { defaultValue, }, name: 'some', });
    }

    // default
    default (defaultValue) {
        return this[CREATE]({ operator: default$, params: { defaultValue, }, });
    }

    // delays
    delay (timingMs = 0) {
        const callback = createGetDelay(timingMs);
        return this[CREATE]({ operator: delay$, callback, });
    }
    delay_ (createTiming) {
        const callback = (value, scope) => (createGetDelay(createTiming(scope))());
        return this[CREATE]({ operator: delay$, callback, name: 'delay_', });
    }

    // generators
    generator (producer) {
        if (!producer || !producer.constructor && !producer.constructor.name.endsWith('GeneratorFunction')) {
            console.error('Invalid type passed to generator');
            const type = producer && producer.constructor ? producer.constructor.name : producer;
            console.error(type);
            throw new Error('generator middleware expect to be passed an Array, Function, GeneratorFunction or AsyncGeneratorFunction');
        }
        return this[CREATE]({ operator: generator$, callback: producer, });
    }
    generator_ (createProducer) {
        const callback = (value, scope) => createProducer(scope)(value);
        return this[CREATE]({ operator: generator$, callback, name: 'generator_', });
    }
    flatten (iterator) {
        const callback = createGeneratorFromIterator(iterator);
        return this[CREATE]({ operator: generator$, callback, name: 'flatten', });
    }
    flatten_ (createIterator) {
        const callback = (value, scope) => createIterator(scope)(createGeneratorFromIterator(value));
        return this[CREATE]({ operator: generator$, callback, name: 'flatten_', });
    }
    keys () {
        const callback = createGeneratorFromIterator(Object.keys);
        return this[CREATE]({ operator: generator$, callback, name: 'keys', });
    }
    values () {
        const callback = createGeneratorFromIterator(Object.values);
        return this[CREATE]({ operator: generator$, callback, name: 'values', });
    }
    entries () {
        const callback = createGeneratorFromIterator(Object.entries);
        return this[CREATE]({ operator: generator$, callback, name: 'entries', });
    }

    // map
    map (callback) {
        return this[CREATE]({ operator: map$, callback, });
    }
    map_ (createMapper = (scope) => () => scope) {
        const callback = (value, scope) => createMapper(scope)(value);
        return this[CREATE]({ operator: map$, callback, name: 'map_', });
    }
    pick (keys) {
        const callback = createPickMapper(keys);
        return this[CREATE]({ operator: map$, callback, name: 'pick', });
    }
    pick_ (createKeys) {
        const callback= (value, scope) => createOmitMapper(createKeys(scope));
        return this[CREATE]({ operator: map$, callback, name: 'pick_', });
    }
    omit (keys) {
        const callback= createOmitMapper(keys);
        return this[CREATE]({ operator: map$, callback, name: 'omit', });
    }
    omit_ (createKeys) {
        const callback= (value, scope) => createOmitMapper(createKeys(scope));
        return this[CREATE]({ operator: map$, callback, name: 'omit_', });
    }
    scan (scanner, acc = 0) {
        const callback= (value) => acc = scanner(acc, value);
        return this[CREATE]({ operator: map$, callback, name: 'scan', });
    }

    scan_ (createScanner, acc = 0) {
        const callback = (value, scope) => acc = createScanner(scope)(value, acc);
        return this[CREATE]({ operator: map$, callback, name: 'scan_', });
    }

    // filter
    filter (predicate= Boolean) {
        const callback = (value) => predicate(value);
        return this[CREATE]({ operator: filter$, callback, });
    }
    filter_ (createPredicate) {
        const callback = (value, scope) => createPredicate(scope)(value);
        return this[CREATE]({ operator: filter$, callback, name: 'filter_', });
    }
    reject (predicate) {
        const callback = (value) => !predicate(value);
        return this[CREATE]({ operator: filter$, callback, name: 'reject', });
    }
    reject_ (scopePredicate) {
        const callback = (value, scope) => !scopePredicate(scope)(value);
        return this[CREATE]({ operator: filter$, callback, name: 'reject_', });
    }
    distinctBy (keys) {
        const callback = createDistinctByFilter(keys);
        return this[CREATE]({ operator: filter$,  callback, name: 'distinctBy', });
    }
    distinctBy_ (createKeys) {
        const callback = (value, scope) => createDistinctByFilter(createKeys(scope));
        return this[CREATE]({ operator: filter$,  callback, name: 'distinctBy_', });
    }
    where (obj) {
        const callback = createWhereFilter(obj);
        return this[CREATE]({ operator: filter$, callback, name: 'where', });
    }
    where_ (createObjectTemplate) {
        const callback = (value, scope) => createWhereFilter(createObjectTemplate(scope));
        return this[CREATE]({ operator: filter$, callback, name: 'where_', });
    }
    distinct () {
        const callback = createDistinctFilter();
        return this[CREATE]({ operator: filter$, callback, name: 'distinct', });
    }
    skip (count = 0) {
        const callback = createSkipFilter(count);
        return this[CREATE]({ operator: filter$, callback, name: 'skip', });
    }
    skipWhile (predicate) {
        const callback = createSkipWhileFilter(predicate);
        return this[CREATE]({ operator: filter$, callback, name: 'skipWhile', });
    }

    // filterMap
    fap (callback) {
        return this[CREATE]({ operator: fap$, callback, name: 'fap', });
    }

    // upStreamFilters
    takeWhile (predicate) {
        const callback = createTakeWhileFilterResolver(predicate);
        return this[CREATE]({ operator: preUpStreamFilter$, callback, name: 'takeWhile', });
    }
    takeUntil (predicate) {
        const callback = createTakeUntilFilterResolver(predicate);
        return this[CREATE]({ operator: preUpStreamFilter$, callback, name: 'takeUntil',  });
    }

    // postUpstreamFilters
    take (max) {
        const callback = createTakeLimiter(max);
        return this[CREATE]({ operator: takeLimit$, callback, name: 'take', });
    }

    // forEach
    forEach (callback) {
        return this[CREATE]({ operator: forEach$, callback: (value) => callback(value), });
    }

    forEach_ (createCallback) {
        const callback = (value, scope) => createCallback(scope)(value);
        return this[CREATE]({ operator: forEach$, callback, name: 'forEach_', });
    }

    // downStream filters
    latest () {
        const callback = createLatestCanceller();
        return this[CREATE]({ operator: downStreamFilter$, callback, name: 'latest', });
    }

    latestBy (keys = []) {
        if (!Array.isArray(keys)) throw new Error('Invalid first parameter passed to "latestBy", Expected to receive an array');
        const callback = createLatestByCanceller(keys);
        return this[CREATE]({ operator: downStreamFilter$, callback, name: 'latestBy', });
    }

    // await
    await () {
        return this[CREATE]({ operator: await$, });
    }

    // onError
    catch (callback = (error, info) => console.error(JSON.stringify({ error, info, }, null, 1))) {
        return this[CREATE]({ operator: catch$, callback, });
    }

    catch_ (createCallback) {
        const callback = (value, scope) => createCallback(scope)(value);
        return this[CREATE]({ operator: catch$, callback, name: 'catch_', });
    }

    // parallel
    parallel (limit) {
        if (limit<1 || !Number.isInteger(limit))
            throw new Error('Expected parallel to receive a number positive integer as parameter.\nAll execution is parallel without limit by default.\nUse parallel with limit if you want to limit the number of parallel executions');
        return this[CREATE]({ operator: parallel$, params: { limit, }, });
    }

    [CREATE] (middlewareBuildKit) {
        const index = this[INDEX] + 1;
        const { callback, params = {}, name, operator, } = middlewareBuildKit;
        const nextMiddleware = operator({ callback, name, index, params, });
        return new this.constructor([ ...this[MIDDLEWARES], nextMiddleware, ], index);
    }
}
module.exports = Operator;
