
export default class CompositeAnd {

  constructor (predicate = returnTrue, next) {
    this.predicate = predicate;
    this.next = next;
  }

  concat (predicate) {
    return new CompositeAnd(predicate, this);
  }

  call () {
    return this.predicate() && (!this.next || this.next.call());
  }
}

export function returnTrue () {
  return true;
}