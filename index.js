const Operator = require('./src/Operator');
const { ASC, DESC, }= require('./src/utils');

function parallel (limit) {
    return new Operator().parallel(limit);
}
function generator (producer) {
    return new Operator().generator(producer, true);
}

module.exports = {
    parallel,
    generator,
    ordered: () => {
        throw new Error('"ordered" async_operator initializer is no longer supported. Do parallel().ordered().. to achieve the same result');
    },
    from: (param) => {
        console.warn('"from" async operator is deprecated, use "generator" instead');
        return generator(param);
    },
    ASC,
    DESC,
};
