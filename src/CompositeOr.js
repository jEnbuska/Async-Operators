class CompositeOr {

  static id = 0;

  constructor (predicate = returnFalse, previous) {
    this.id = CompositeOr.id++;
    this.predicate = predicate;
    this.previous = previous;
  }

  concat (predicate) {
    return Or(predicate, this);
  }

  call () {
    return this.predicate() || this.previous && this.previous.call();
  }

  retire () {
    this.predicate = returnFalse;
    delete this.previous;
  }
}

export function returnFalse () {
  return false;
}

export default function Or (predicate, previous) {
  return new CompositeOr(predicate, previous);
}