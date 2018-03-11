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

const { prepareRepeat, prepareReduce, prepareOrdered, prepareDefault, prepareLatest, prepareEndReduce, } = require('./operatorMiddlewares');

class Operator extends Emitter {

    listen () {
        throw new Error('Unsupported operation listen called on "Operator"');
    }

    emit () {
        throw new Error('Operators cannot emit values');
    }

    retire () {
        throw new Error('Operators cannot be manually retired');
    }

    async pull (..._) {
        if (_.length) {
            throw new Error('"pull" should be called without parameters.');
        }
        const tail = await Emitter._createTail();
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

    latestBy (keys) {
        const callback = createLatestTaskFilter(keys);
        return this._create({ operator: prepareLatest, callback, name: 'latestBy', });
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
        const callback = (a, b) => comparator(a[1].val, b[1].val);
        return this._create({ operator: prepareOrdered, callback, name: 'sort', });
    }
    sortBy (obj) {
        const objectComparator= createObjectComparator(obj);
        const callback = (a, b) => objectComparator(a[1].val, b[1].val);
        return this._create({ operator: prepareOrdered, callback, name: 'sortBy', });
    }

    // endReducer
    first () {
        const { callback, defaultValue, } = createFirstEndResolver();
        return this._create({ operator: prepareEndReduce, callback, params: { defaultValue, }, name: 'first', });
    }
    every (predicate = defaultFilter) {
        const { callback, defaultValue, } = createEveryEndResolver(predicate);
        return this._create({ operator: prepareEndReduce, callback, params: { defaultValue, }, name: 'every', });
    }

    some (predicate = defaultFilter) {
        const { callback, defaultValue, } = createSomeEndResolver(predicate);
        return this._create({ operator: prepareEndReduce, callback, params: { defaultValue, }, name: 'some', });
    }

    // repeaters
    repeatWhile (predicate, limit = 0) {
        return this._create({ operator: prepareRepeat, callback: predicate, name: 'repeatWhile', params: { limit, }, });
    }

    repeatUntil (predicate, limit = 0) {
        const negated = () => !predicate();
        return this._create({ operator: prepareRepeat, callback: negated, name: 'repeatUntil', params: { limit, }, });
    }
    // default
    default (defaultValue) {
        return this._create({ operator: prepareDefault, params: { defaultValue, }, });
    }

    _create ({ operator, callback, params = {}, name, }) {
        const { _middlewares, } = this;
        const index = _middlewares.length;
        const md = operator({ callback, params, name, index, });
        return new Operator([ ..._middlewares, md, ]);
    }
}
module.exports = Operator;
