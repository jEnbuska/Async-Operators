export default function And(predicate) {
  return new CompositeAnd(predicate);
}

class CompositeAnd {

  constructor(predicate = returnTrue, previous=returnTrue) {
    this.predicate = predicate;
    this.previous = previous;
  }

  concat(predicate) {
    return And(predicate, this);
  }

  call() {
    return this.predicate() && this.previous.call();
  }
}

function returnTrue() {
  return true;
}