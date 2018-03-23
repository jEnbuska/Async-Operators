const Operator = require('./src/Operator');
const { prepareProvider, } = require('./src/middlewares');
const { createGeneratorFromIterator, createIntegerRange, ASC, DESC, }= require('./src/utils');

function provider (param = {}) {
    const { generator, map, flatten, range, callback, } = param;
    if (map) {
        return new Operator([ prepareProvider({ callback: () => map, name: 'map', }), ]);
    } else if (generator) {
        return new Operator([ prepareProvider({ callback: generator, name: 'generator',  }), ]);
    } else if (flatten) {
        const callback = () => createGeneratorFromIterator()(flatten);
        return new Operator([ prepareProvider({ callback, name: 'generator', }), ]);
    } else if (range) {
        const intRange = createIntegerRange(range.from, range.to);
        const callback = () => createGeneratorFromIterator()(intRange);
        return new Operator([ prepareProvider({ callback, name: 'generator', }), ]);
    } else if (callback) {
        return new Operator([ prepareProvider({ callback, name: 'callback', }), ]);
    }
    throw new Error('Provider Expect to receive an object with key "map", "flatten", "range" or "generator"');
}
module.exports = {
    provider,
    ASC,
    DESC,
};
