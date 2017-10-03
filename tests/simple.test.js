import lazy from '../src';
import { sleep, } from './common';

describe('simpleTests', async () => {
  test('map', async () => {
    const result = [];
    console.log(lazy())
    const instance = lazy()
    .map(it => it*2)
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    console.log(instance)
    await instance.propose(1, 2, 3, 4);
    expect(result).toEqual([ 2, 4, 6, 8, ]);
  });

  test('filter', async() => {
    const result = [];
    const instance = lazy()
      .filter(it => it%2===0)
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose(1, 2, 3, 4);
    expect(result).toEqual([ 2, 4, ]);
  });

  test('reduce', async() => {
    const result = [];
    const instance = lazy()
      .reduce((acc, next) => [ ...acc, next, ], [])
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose(1, 2, 3, 4);
    expect(result).toEqual([ [ 1, 2, 3, 4, ], ]);
  });

  test('peek', async() => {
    const result = [];
    const instance = lazy()
      .peek(next => result.push(next))
      .share();
    instance.pull();
    await instance.propose(1, 2, 3, 4);
    expect(result).toEqual([ 1, 2, 3, 4, ]);
  });

  test('scan', async() => {
    const result = [];
    const instance = lazy()
      .scan((acc, val) => [ ...acc, val, ], [])
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose(1, 2, 3, 4);
    expect(result).toEqual([ [ 1, ], [ 1, 2, ], [ 1, 2, 3, ], [ 1, 2, 3, 4, ], ]);
  });

  test('flatten', async() => {
    const result = [];
    const instance = lazy()
      .flatten()
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose([ 1, 2, 3, 4, ]);
    expect(result).toEqual([ 1, 2, 3, 4, ]);
  });

  test('takeWhile', async() => {
    const result = [];
    const instance = lazy()
      .takeWhile(it => it<3)
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose(1, 2, 3, 4);
    expect(result).toEqual([ 1, 2, ]);
  });

  test('takeUntil', async() => {
    const result = [];
    const instance = lazy()
      .takeUntil(it => it>=3)
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose(1, 2, 3, 4);
    expect(result).toEqual([ 1, 2, ]);
  });

  test('take', async() => {
    const result = [];
    const instance = lazy()
      .take(2)
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose(1, 2, 3, 4);
    expect(result).toEqual([ 1, 2, ]);
  });

  test('skip', async() => {
    const result = [];
    const instance = lazy()
      .skip(2)
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose(1, 2, 3, 4);
    expect(result).toEqual([ 3, 4, ]);
  });

  test('pick', async() => {
    const result = [];
    const instance = lazy()
      .pick('name', 'age')
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose({ name: 'John', age: 20, gender: 1, }, { name: 'Lisa', age: 30, gender: 0, });
    expect(result).toEqual([ { name: 'John', age: 20, }, { name: 'Lisa', age: 30, }, ]);
  });

  test('distinctBy', async() => {
    const result = [];
    const instance = lazy()
      .distinctBy(it => it.age)
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose({ name: 'John', age: 20, gender: 1, }, { name: 'Lisa', age: 30, gender: 0, }, { name: 'Matt', age: 20, gender: 1, });
    expect(result).toEqual([ { name: 'John', age: 20, gender: 1, }, { name: 'Lisa', age: 30, gender: 0, }, ]);
  });

  test('where', async() => {
    const result = [];
    const instance = lazy()
      .where({ age: 20, })
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose({ name: 'John', age: 20, gender: 1, }, { name: 'Lisa', age: 30, gender: 0, }, { name: 'Matt', age: 20, gender: 1, });
    expect(result).toEqual([ { name: 'John', age: 20, gender: 1, }, { name: 'Matt', age: 20, gender: 1, }, ]);
  });

  test('every', async() => {
    const result = [];
    const instance = lazy()
      .every(it => it.age>20)
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose({ name: 'John', age: 20, gender: 1, }, { name: 'Lisa', age: 30, gender: 0, }, { name: 'Matt', age: 20, gender: 1, });
    expect(result).toEqual([ false, ]);
    await instance.propose({ name: 'John', age: 21, gender: 1, }, { name: 'Lisa', age: 30, gender: 0, }, { name: 'Matt', age: 21, gender: 1, });
    expect(result).toEqual([ false, true, ]);
  });

  test('some', async() => {
    const result = [];
    const instance = lazy()
      .some(it => it.age>30)
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose({ name: 'John', age: 20, gender: 1, }, { name: 'Lisa', age: 30, gender: 0, }, { name: 'Matt', age: 20, gender: 1, });
    expect(result).toEqual([ false, ]);
    await instance.propose({ name: 'John', age: 20, gender: 1, }, { name: 'Lisa', age: 31, gender: 0, }, { name: 'Matt', age: 20, gender: 1, });
    expect(result).toEqual([ false, true, ]);
  });

  test('skipWhile', async() => {
    const result = [];
    const instance = lazy()
      .skipWhile(it => it.age<30)
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose({ name: 'John', age: 20, gender: 1, }, { name: 'Lisa', age: 30, gender: 0, }, { name: 'Matt', age: 20, gender: 1, });
    expect(result).toEqual([ { name: 'Lisa', age: 30, gender: 0, }, { name: 'Matt', age: 20, gender: 1, }, ]);
  });

  test('awaitResolved', async() => {
    const result = [];
    const instance = lazy()
      .awaitResolved()
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    console.log(instance)
    await instance.propose(sleep(20, { name: 'John', age: 20, gender: 1, }), sleep(10, { name: 'Lisa', age: 30, gender: 0, }), sleep(5, { name: 'Matt', age: 20, gender: 1, }));
    expect(result).toEqual([ { name: 'John', age: 20, gender: 1, }, { name: 'Lisa', age: 30, gender: 0, }, { name: 'Matt', age: 20, gender: 1, }, ]);
  });

  test('takeLast', async() => {
    const result = [];
    const instance = lazy()
      .takeLast(2)
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose({ name: 'John', age: 20, gender: 1, }, { name: 'Lisa', age: 30, gender: 0, }, { name: 'Matt', age: 20, gender: 1, });
    expect(result).toEqual([ { name: 'Lisa', age: 30, gender: 0, }, { name: 'Matt', age: 20, gender: 1, }, ]);
  });

  test('sum', async() => {
    const result = [];
    const instance = lazy()
      .sum()
      .share();
    instance.pull({ onNext (val) {
      result.push(val);
    }, });
    await instance.propose(1, 2, 3, 4);
    expect(result).toEqual([ 1+2+3+4, ]);
  });
});
