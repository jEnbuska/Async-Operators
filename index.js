const Operator = require('./src/Operator');
const Emitter = require('./src/Emitter');
const { provider: createProvider, } = require('./src/middlewares');
const { createGeneratorFromIterator, createIntegerRange, ASC, DESC, }= require('./src/utils');

function provider (param = {}) {
    const { generator, map, flatten, range, callback, } = param;
    if (map) {
        return new Operator([ createProvider({ callback: () => map, params: { type: 'map', }, }), ]);
    } else if (generator) {
        return new Operator([ createProvider({ callback: generator, params: { type: 'generator', }, }), ]);
    } else if (flatten) {
        const callback = () => createGeneratorFromIterator()(flatten);
        return new Operator([ createProvider({ callback, params: { type: 'generator', }, }), ]);
    } else if (range) {
        const intRange = createIntegerRange(range.from, range.to);
        const callback = () => createGeneratorFromIterator()(intRange);
        return new Operator([ createProvider({ callback, params: { type: 'generator', }, }), ]);
    } else if (callback) {
        return new Operator([ createProvider({ callback, params: { type: 'callback', }, }), ]);
    }
    throw new Error('Provider Expect to receive an object with key "map", "flatten", "range" or "generator"');
}

function emitter () {
    return new Emitter();
}

module.exports = {
    provider,
    emitter,
    ASC,
    DESC,
};
