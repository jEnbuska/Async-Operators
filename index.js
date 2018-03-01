const Operator = require('./src/Operator');
const { provider: createProvider, } = require('./src/middlewareCreators');
const { createGeneratorFromIterator, createIntegerRange, ASC, DESC, }= require('./src/utils');

function provider (param = {}) {
    const { function: func, future, generator, value, flatten, range, } = param;
    if (generator) {
        return new Operator([ createProvider({ callback: generator, params: { type: 'generator', }, }), ]);
    } else if (future) {
        return new Operator([ createProvider({ callback: future, params: { type: 'async', }, }), ]);
    } else if (func) {
        return new Operator([ createProvider({ callback: func, params: { type: 'func', }, }), ]);
    } else if (param.hasOwnProperty('value')) {
        return new Operator([ createProvider({ callback: () => value, params: { type: 'func', }, }), ]);
    } else if (flatten) {
        const callback = () => createGeneratorFromIterator()(flatten);
        return new Operator([ createProvider({ callback, params: { type: 'generator', }, }), ]);
    } else if (range) {
        const intRange = createIntegerRange(range.from, range.to);
        const callback = () => createGeneratorFromIterator()(intRange);
        return new Operator([ createProvider({ callback, params: { type: 'generator', }, }), ]);
    }
    throw new Error('Provider Expect to receive an object with key "function", "value", "generator" or "flatten"');
}

module.exports = {
    provider,
    ASC,
    DESC,
};
