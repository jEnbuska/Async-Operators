import Operator from './Operator';

export function ordered () {
  return new Operator();
}
export function parallel () {
  return new Operator().parallel();
}