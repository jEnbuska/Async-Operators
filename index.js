const Operator = require('./src/Operator');
const Emitter = require('./src/Emitter');
const { prepareProvider, } = require('./src/operatorMiddlewares');
const { createGeneratorFromIterator, createIntegerRange, ASC, DESC, }= require('./src/utils');

function provider (param = {}) {
    const { generator, map, flatten, range, callback, } = param;
    if (map) {
        return new Operator([ prepareProvider({ callback: () => map, params: { type: 'map', }, }), ]);
    } else if (generator) {
        return new Operator([ prepareProvider({ callback: generator, params: { type: 'generator', }, }), ]);
    } else if (flatten) {
        const callback = () => createGeneratorFromIterator()(flatten);
        return new Operator([ prepareProvider({ callback, params: { type: 'generator', }, }), ]);
    } else if (range) {
        const intRange = createIntegerRange(range.from, range.to);
        const callback = () => createGeneratorFromIterator()(intRange);
        return new Operator([ prepareProvider({ callback, params: { type: 'generator', }, }), ]);
    } else if (callback) {
        return new Operator([ prepareProvider({ callback, params: { type: 'callback', }, }), ]);
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
