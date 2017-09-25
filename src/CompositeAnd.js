export default function CompositeAnd(predicate) {
  return new CompositeAndImplementation(predicate);
}

class CompositeAndImplementation {

  constructor(predicate = returnTrue, previous=returnTrue) {
    this.predicate = predicate;
    this.previous = previous;
  }

  concat(predicate) {
    return new CompositeAndImplementation(predicate, this);
  }

  call() {
    return this.predicate() && this.previous.call();
  }
}

function returnTrue() {
  return true;
}