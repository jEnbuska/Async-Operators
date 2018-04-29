const Operator = require('./src/Operator');
const { generatorProvider$, valueProvider$, callbackProvider$, await$, } = require('./src/middlewares');
const { createGeneratorFromIterator, createIntegerRange, ASC, DESC, }= require('./src/utils');

const provider = {
    fromValue (value) {
        return new Operator([ valueProvider$({ params: { value, }, name: 'fromValue', }), ]);
    },
    fromGenerator (generator) {
        return new Operator([ generatorProvider$({ callback: generator, name: 'fromGenerator',  }), ]);
    },
    fromIterable (iterable) {
        const callback = () => createGeneratorFromIterator()(iterable);
        return new Operator([ generatorProvider$({ callback, name: 'fromIterable', }), ]);
    },
    fromRange ({ from, to, }) {
        const intRange = createIntegerRange(from, to);
        const callback = () => createGeneratorFromIterator()(intRange);
        return new Operator([ generatorProvider$({ callback, name: 'fromRange', }), ]);
    },
    fromCallback (callback) {
        return new Operator([ callbackProvider$({ callback, name: 'fromCallback', }), ]);
    },
    fromPromise (promise) {
        return new Operator([ valueProvider$({ params: { value: promise, }, name: 'fromPromise', }), await$({ name: 'fromPromise', }), ]);
    },
    fromEmitter(){
        return new Operator()
    }
};

module.exports = {
    provider,
    ASC,
    DESC,
};
