
class CompositeAnd {

    constructor (predicate = returnTrue, next) {
        this.predicate = predicate;
        this.next = next;
    }

    concat (predicate) {
        return new CompositeAnd(predicate, this);
    }

    call = () => this.predicate() && (!this.next || this.next.call())
}
module.exports = CompositeAnd;
function returnTrue () {
    return true;
}
