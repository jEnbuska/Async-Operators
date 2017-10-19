const Operator = require('./src/Operator');
const { ASC, DESC, }= require('./src/utils');

function ordered () {
    return new Operator();
}
function parallel () {
    return new Operator().parallel();
}
module.exports = {
    ordered,
    parallel,
    ASC,
    DESC,
};