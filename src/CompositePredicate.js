export default class CompositePredicate {

  constructor(previous) {
    this.previous = previous;
  }

  cancelWhen(predicate) {
    this.predicate = predicate;
    return new CompositePredicate(this);
  }

  isCancelled() {
    return this.previous && this.previous._isCancelled();
  }

  _isCancelled() {
    return this.predicate() || (this.previous && this.previous._isCancelled());
  }
}