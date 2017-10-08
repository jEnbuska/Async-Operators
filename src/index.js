const Operator = require('./Operator');

function ordered () {
  return new Operator();
}
function parallel () {
  return new Operator().parallel();
}
module.exports = {
  ordered,
  parallel,
}