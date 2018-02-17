const Operator = require('./src/Operator');
const { ASC, DESC, }= require('./src/utils');

function ordered () {
    return new Operator();
}
function parallel (limit) {
    return new Operator().parallel(limit);
}
function from (producer) {
    return new Operator().from(producer, true);
}

module.exports = {
    ordered,
    parallel,
    from,
    ASC,
    DESC,
};
