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
}

function returnTrue () {
  return true;
}

export default function And (predicate, previous) {
  return new CompositeAnd(predicate, previous);
}