
class CompositeAnd {

  static id = 0;

  constructor (predicate = returnTrue, next) {
    this.id = CompositeAnd.id++;
    this.predicate = predicate;
    this.next = next;
  }

  push (predicate) {
    const previous = this.predicate;
    this.predicate = () => previous() && predicate();
    return this;
  }

  concat (predicate) {
    return And(predicate, this);
  }

  call () {
    return this.predicate() && (!this.next || this.next.call());
  }

  retire () {
    console.log('retire')
    this.predicate = returnFalse;
    delete this.next;
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