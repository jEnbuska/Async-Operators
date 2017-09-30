
class CompositeAnd {

  static id = 0;

  constructor (predicate = returnTrue, previous) {
    this.id = CompositeAnd.id++;
    this.predicate = predicate;
    this.previous = previous;
  }

  concat (predicate) {
    return And(predicate, this);
  }

  call () {
    return this.predicate() && (!this.previous || this.previous.call());
  }

  retire () {
    this.predicate = returnFalse;
    delete this.previous;
  }
}

export function returnTrue () {
  return true;
}

export function returnFalse () {
  return false;
}
export default function And (predicate, previous) {
  return new CompositeAnd(predicate, previous);
}