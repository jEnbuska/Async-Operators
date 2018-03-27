const Operator = require('./src/Operator');
const { prepareGeneratorProvider, prepareValueProvider, prepareCallbackProvider, prepareAwait, } = require('./src/middlewares');
const { createGeneratorFromIterator, createIntegerRange, ASC, DESC, }= require('./src/utils');

const provider = {
    fromValue (value) {
        return new Operator([ prepareValueProvider({ params: { value, }, name: 'fromValue', }), ]);
    },
    fromGenerator (generator) {
        return new Operator([ prepareGeneratorProvider({ callback: generator, name: 'fromGenerator',  }), ]);
    },
    fromIterable (iterable) {
        const callback = () => createGeneratorFromIterator()(iterable);
        return new Operator([ prepareGeneratorProvider({ callback, name: 'fromIterable', }), ]);
    },
    fromRange ({ from, to, }) {
        const intRange = createIntegerRange(from, to);
        const callback = () => createGeneratorFromIterator()(intRange);
        return new Operator([ prepareGeneratorProvider({ callback, name: 'fromRange', }), ]);
    },
    fromCallback (callback) {
        return new Operator([ prepareCallbackProvider({ callback, name: 'fromCallback', }), ]);
    },
    fromPromise (promise) {
        return new Operator([ prepareValueProvider({ params: { value: promise, }, name: 'fromPromise', }), prepareAwait({ name: 'fromPromise', }), ]);
    },
};

module.exports = {
    provider,
    ASC,
    DESC,
};
