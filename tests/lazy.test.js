import lazy from '../src/Lazy';

async function sleep (time, result) {
  return new Promise(res => setTimeout(() => {
    res(result);
  }, time));
}

describe('lazy', async () => {
  test('propose', async () => {
    const peeks = [];
    const instance= await lazy()
      .parallel()
      .peek(val => peeks.push(val))
      .map(it => it*2)
      .create();
    const result = [];
    let resolves = 0;
    instance
      .filter(it => it!==6)
      .pull({
        onNext (val, unObserve) {
          unObserve();
          result.push(val);
        },
        onResolve () {
          resolves++;
        },
      });
    await instance.propose(3);
    await instance.propose(10);
    await instance.propose(1);
    expect(resolves).toBe(3);
    expect(result).toEqual([ 20, ]);
    expect(peeks).toEqual([ 3, 10, ]);
  });

  test('debounceTime', async () => {

    const result =await  lazy()
      .parallel()
      .awaitResolved()
      .debounceTime(10)
      .sum()
      .push(sleep(10, 5),
        sleep(25, 9),
        sleep(10, 6),
        sleep(5, 1),
        sleep(25, 30)
      );
    expect(result).toBe(6 + 30)
  })
  test('create simple', async () => {
    const result0 = await lazy()
      .parallel()
      .awaitResolved()
      .map(it => it*2)
      .create()
      .reduce()
      .push(
        sleep(10, 5),       // 2 ->  10
        sleep(15, 3),       // 3 ->  6
        sleep(25, 10),    // 5 ->  20 -> skip
        sleep(20, 5),     // 4 ->   10
        sleep(5, 1),         // 1 ->  2
        sleep(25, 30)   // 6 -> 60 -> end)
      );
    expect(result0).toEqual([ 2, 10, 6, 10, 20, 60, ]);
  });

  test('create re-use', async() => {

    const instance = lazy()
      .parallel()
      .awaitResolved()
      .map(it =>  it*2)
      .takeUntil(it => it<50)
      .create();

    const result = await instance
      .filter(it => it <15)
      .reduce()
      .push(
        sleep(10, 5),       // 2 ->  10
        sleep(15, 3),       // 3 ->  6
        sleep(25, 10),    // 5 ->  20 -> skip
        sleep(20, 5),     // 4 ->   10
        sleep(5, 1),         // 1 ->  2
        sleep(25, 30)   // 6 -> 60 -> end
      );
    expect(result).toEqual([ 2, 10, 6, 10, ]);
    const result2 = await instance
          .reduce((acc, next) => [ ...acc, next, ], [])
          .map(it => it*3)
          .push(
          sleep(10, 5),
          sleep(15, 3),
          sleep(25, 10),
          sleep(20, 5),
          sleep(5, 1),
          sleep(25, 30)
        );
    expect(result2).toEqual([]);
  });

  test('latestBy', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .latestBy('a')
      .map(it => sleep(it.b, it))
      .awaitResolved()
      .reduce()
      .push(sleep(20, { a: 'SUBJECT_1', b: 20, c: 'first', }), sleep(10, { a: 'SUBJECT_1', b: 40, c: 'second', }), sleep(15, { a: 'SUBJECT_2', b: 40, c: 'third', }));
    expect(result).toEqual([ { a: 'SUBJECT_1', b: 20, c: 'first', }, { a: 'SUBJECT_2', b: 40, c: 'third', }, ]);
  });

  test('reduce synchronous', async () => {
    const [ first, second, ]= await lazy()
      .awaitResolved()
      .reduce()
      .push(sleep(30, 30), sleep(20, 20));
    expect(first).toBe(30);
    expect(second).toBe(20);
  });

  test('reduce parallel', async () => {
    const [ first, second, ]= await lazy()
      .parallel()
      .awaitResolved()
      .reduce()
      .push(sleep(30, 30), sleep(20, 20));
    expect(first).toBe(20);
    expect(second).toBe(30);
  });

  test('takeWhile synchronous', async () => {
    const result = await lazy()
      .awaitResolved()
      .takeWhile(({ age, }) => age < 50)
      .reduce()
      .push(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }), // 2
        sleep(15, { name: 'Lisa', age: 30, }), // 1
        sleep(30, { name: 'Kim', age: 40, }),
        sleep(20, { name: 'Ted', age: 50, }), // 3
      );
    expect(result).toEqual([ { name: 'John', age: 25, }, { name: 'John', age: 20, }, { name: 'Lisa', age: 30, }, { name: 'Kim', age: 40, }, ]);
  });

  test('takeWhile parallel', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .takeWhile(({ age, }) => age < 50)
      .reduce()
      .push(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }), // 2
        sleep(15, { name: 'Lisa', age: 30, }), // 1
        sleep(30, { name: 'Kim', age: 40, }),
        sleep(20, { name: 'Ted', age: 50, }), // 3
      );
    expect(result).toEqual([ { name: 'Lisa', age: 30, }, { name: 'John', age: 20, }, ]);
  });

  test('where synchronous', async () => {
    const [ first, second, third, ]= await lazy()
      .awaitResolved()
      .where({ a: 1, })
      .reduce()
      .push(sleep(30, { a: 1, b: 1, }), sleep(20, { a: 1, b: 2, }), sleep(25, { a: 2, b: 1, }));
    expect(first).toEqual({ a: 1, b: 1, });
    expect(second).toEqual({ a: 1, b: 2, });
    expect(third).toBeUndefined();
  });
  test('where parallel', async () => {
    const [ first, second, third, ]= await lazy()
      .parallel()
      .awaitResolved()
      .where({ a: 1, })
      .reduce()
      .push(sleep(30, { a: 1, b: 1, }), sleep(20, { a: 1, b: 2, }), sleep(25, { a: 2, b: 1, }));
    expect(first).toEqual({ a: 1, b: 2, });
    expect(second).toEqual({ a: 1, b: 1, });
    expect(third).toBeUndefined();
  });

  test('skip synchronous', async () => {
    const [ first, second, ]= await lazy()
      .awaitResolved()
      .where({ a: 1, })
      .skip(1)
      .reduce()
      .push(sleep(30, { a: 1, b: 1, }), sleep(20, { a: 1, b: 2, }), sleep(25, { a: 2, b: 1, }));

    expect(first).toEqual({ a: 1, b: 2, });
    expect(second).toBeUndefined();
  });
  test('skip parallel', async () => {
    const [ first, second, ]= await lazy()
      .parallel()
      .awaitResolved()
      .where({ a: 1, })
      .skip(1)
      .reduce()
      .push(sleep(30, { a: 1, b: 1, }), sleep(20, { a: 1, b: 2, }), sleep(15, { a: 2, b: 1, }));

    expect(first).toEqual({ a: 1, b: 1, });
    expect(second).toBeUndefined();
  });

  test('take synchronous', async () => {
    const [ first, second, ]= await lazy()
      .awaitResolved()
      .take(2)
      .reduce()
      .push(sleep(30, 30), sleep(20, 20), sleep(10, 10));
    expect(first).toBe(30);
    expect(second).toBe(20);
  });

  test('take parallel', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .take(3)
      .reduce()
      .push(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }), // 2
        sleep(15, { name: 'Lisa', age: 30, }), // 1
        sleep(30, { name: 'Kim', age: 40, }),
        sleep(20, { name: 'Ted', age: 50, }), // 3
      );
    expect(result).toEqual([ { name: 'Lisa', age: 30, }, { name: 'John', age: 20, }, { name: 'Ted', age: 50, }, ]);
  });

  test('parallel take last', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .takeLast(2)
      .push(sleep(30, 30), sleep(20, 20), sleep(40, 40), sleep(35, 35));
    expect(result).toEqual([ 35, 40, ]);
  });

  test('map', async () => {
    const [ first, second, ] = await lazy()
      .awaitResolved()
      .map(it => it*2)
      .reduce()
      .push(sleep(30, 30), sleep(20, 20));
    expect(first).toBe(60);
    expect(second).toBe(40);
  });

  test('scan synchronous', async () => {
    const result = await lazy()
      .awaitResolved()
      .scan((acc = {}, next) => Object.assign(acc, { [next]: true, }))
      .takeLast()
      .push(sleep(30, 30), sleep(20, 20));
    expect(result).toEqual([ { 30: true, 20: true, }, ]);
    const result2 = await lazy()
      .awaitResolved()
      .scan((acc = {}, next) => ({ ...acc, [next]: true, }))
      .reduce()
      .push(sleep(30, 30), sleep(20, 20));
    expect(result2).toEqual([ { 30: true, }, { 30: true, 20: true, }, ]);
  });

  test('scan parallel', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .scan((acc = {}, next) => ({ ...acc, [next]: true, }))
      .reduce()
      .push(sleep(30, 30), sleep(20, 20));
    expect(result).toEqual([ { 20: true, }, { 30: true, 20: true, }, ]);
    const result2 = await lazy()
      .parallel()
      .awaitResolved()
      .scan((acc = {}, next) => ({ ...acc, [next]: true, }))
      .take(5)
      .reduce()
      .push(
        sleep(30, 1), // 4
        sleep(30, 2), // 5
        sleep(20, 3), // 2
        sleep(15, 4), // 1
        sleep(30, 5), // 6
        sleep(20, 6), // 3
      );
    expect(result2).toEqual([
      { 4: true, },
      { 3: true, 4: true, },
      { 3: true, 4: true, 6: true, },
      { 1: true, 3: true, 4: true, 6: true, },
      { 1: true, 2: true, 3: true, 4: true, 6: true, },
    ]);
  });

  test('sum parallel', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .sum()
      .push(sleep(30, 30), sleep(20, 20));
    expect(result).toBe(50);
  });

  test('distinctBy synchronous', async () => {
    const result = await lazy()
      .awaitResolved()
      .distinctBy(it => it.name)
      .reduce()
      .push(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }),
        sleep(15, { name: 'Lisa', age: 30, })
      );
    expect(result).toEqual([ { name: 'John', age: 25, }, { name: 'Lisa', age: 30, }, ]);
  });

  test('distinctBy parallel', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .distinctBy('name')
      .reduce()
      .push(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }),
        sleep(15, { name: 'Lisa', age: 30, })
      );
    expect(result).toEqual([ { name: 'Lisa', age: 30, }, { name: 'John', age: 20, }, ]);
  });

  test('filter parallel', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .filter(({ age, }) => age>=25)
      .reduce()
      .push(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }),
        sleep(15, { name: 'Lisa', age: 30, })
      );
    expect(result).toEqual([ { name: 'Lisa', age: 30, }, { name: 'John', age: 25, }, ]);
  });

  test('filter synchronous', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .filter('age')
      .reduce()
      .push(
        sleep(30, { name: 'John', age: undefined, }),
        sleep(20, { name: 'John', age: 0, }),
        sleep(15, { name: 'Lisa', age: 30, })
      );
    expect(result).toEqual([ { name: 'Lisa', age: 30, }, ]);
  });

  test('peek parallel', async () => {
    const ages = [];
    await lazy()
      .parallel()
      .map(async res => await res)
      .peek(({ age, }) => ages.push(age))
      .distinctBy('name')
      .peek(({ age, }) => ages.push(age))
      .reduce()
      .push(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }),
        sleep(15, { name: 'Lisa', age: 30, })
      );
    expect(ages).toEqual([ 30, 30, 20, 20, 25, ]);
  });

  test('skipWhile takeUntil synchronous', async () => {
    const result = await lazy()
      .awaitResolved()
      .takeUntil(it => it<5)
      .skipWhile(it => it<2)
      .reduce()
      .push(
        sleep(30, 0),
        sleep(30, 1),
        sleep(20, 2),
        sleep(15, 3),
        sleep(30, 4),
        sleep(20, 5),
      );
    expect(result).toEqual([ 2, 3, 4, ]);
  });

  test('skipWhile takeUntil parallel', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .takeUntil(it => it<5)
      .skipWhile(it => it<2)
      .reduce()
      .push(
        sleep(30, 0), // 6
        sleep(10, 1), // 1
        sleep(20, 2),  // 4
        sleep(15, 3), // 2
        sleep(18, 4), // 3
        sleep(30, 4), // 7
        sleep(20, 5), // 5
      );
    expect(result).toEqual([ 3, 4, 2, ]);
  });

  test('pick parallel', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .pick('a', 'b')
      .reduce()
      .push(
        sleep(30, { a: 1, b: 2, c: 3, }),
        sleep(30, { a: 4, b: 5, c: 6, }),
        sleep(20, { a: 7, b: 8, c: 9, }),
        sleep(15, { a: 10, b: 11, c: 12, }),
        sleep(30, { a: 13, b: 14, c: 15, }),
        sleep(20, { a: 16, b: 17, c: 18, }),
      );
    expect(result).toEqual([
      { a: 10, b: 11, },
      { a: 7, b: 8, },
      { a: 16, b: 17, },
      { a: 1, b: 2, },
      { a: 4, b: 5, },
      { a: 13, b: 14, },
    ]);
  });

  test('parallel ordered', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .pick('a', 'b')
      .ordered()
      .reduce()
      .push(
        sleep(30, { a: 1, b: 2, c: 3, }),
        sleep(30, { a: 4, b: 5, c: 6, }),
        sleep(20, { a: 7, b: 8, c: 9, }),
        sleep(15, { a: 10, b: 11, c: 12, }),
        sleep(30, { a: 13, b: 14, c: 15, }),
        sleep(20, { a: 16, b: 17, c: 18, }),
      );
    expect(result).toEqual([
      { a: 1, b: 2, },
      { a: 4, b: 5, },
      { a: 7, b: 8, },
      { a: 10, b: 11, },
      { a: 13, b: 14, },
      { a: 16, b: 17, },
    ]);
  });

  test('sequential parallel ordered', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .pick('a', 'b')
      .ordered()
      .parallel()
      .map(next => sleep(20-next.a, next))
      .ordered()
      .reduce()
      .push(
        sleep(30, { a: 1, b: 2, c: 3, }),
        sleep(30, { a: 4, b: 5, c: 6, }),
        sleep(20, { a: 7, b: 8, c: 9, }),
        sleep(15, { a: 10, b: 11, c: 12, }),
        sleep(30, { a: 13, b: 14, c: 15, }),
        sleep(20, { a: 16, b: 17, c: 18, }),
      );
    expect(result).toEqual([
      { a: 1, b: 2, },
      { a: 4, b: 5, },
      { a: 7, b: 8, },
      { a: 10, b: 11, },
      { a: 13, b: 14, },
      { a: 16, b: 17, },
    ]);
  });

  test('flatten synchronous', async () => {
    const result = await lazy()
      .flatten()
      .reduce()
      .push([ [ 1, 2, 3, ], [ 4, 3, 1, ], ], [ [ 3, 2, 1, ], [ 2, 2, 2, ], ]);
    expect(result).toEqual([ [ 1, 2, 3, ], [ 4, 3, 1, ], [ 3, 2, 1, ], [ 2, 2, 2, ], ]);
    const result2 = await lazy()
      .flatten()
      .flatten()
      .reduce()
      .push([ [ 1, 2, 3, ], [ 4, 3, 1, ], ], [ [ 3, 2, 1, ], [ 2, 2, 2, ], ]);
    expect(result2).toEqual([ 1, 2, 3, 4, 3, 1, 3, 2, 1, 2, 2, 2, ]);
  });

  test('flatten parallel', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .flatten()
      .reduce()
      .push(sleep(5, [ [ 1, 2, 3, ], [ 4, 3, 1, ], ]), sleep(1, [ [ 3, 2, 1, ], [ 2, 2, 2, ], ]));
    expect(result).toEqual([ [ 3, 2, 1, ], [ 2, 2, 2, ], [ 1, 2, 3, ], [ 4, 3, 1, ], ]);

    const result2 = await lazy()
      .parallel()
      .awaitResolved()
      .flatten()
      .parallel()
      .awaitResolved()
      .flatten()
      .reduce()
      .push(sleep(20, [ sleep(30, [ 1, 2, 3, ]), sleep(0, [ 4, 3, 1, ]), ]), sleep(10, [ sleep(5, [ 3, 2, 1, ]), sleep(25, [ 2, 2, 2, ]), ]));
    expect(result2).toEqual([ 3, 2, 1, 4, 3, 1, 2, 2, 2, 1, 2, 3, ]);
  });

  test('flatten parallel ordered', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .flatten()
      .ordered()
      .reduce()
      .push(sleep(5, [ [ 1, 2, 3, ], [ 4, 3, 1, ], ]), sleep(1, [ [ 3, 2, 1, ], [ 2, 2, 2, ], ]));
    expect(result).toEqual([ [ 1, 2, 3, ], [ 4, 3, 1, ], [ 3, 2, 1, ], [ 2, 2, 2, ], ]);

    const result2 = await lazy()
      .parallel()
      .awaitResolved()
      .flatten()
      .parallel()
      .awaitResolved()
      .flatten()
      .ordered()
      .reduce()
      .push(sleep(20, [ sleep(30, [ 1, 2, 3, ]), sleep(0, [ 4, 3, 1, ]), ]), sleep(10, [ sleep(5, [ 3, 2, 1, ]), sleep(25, [ 2, 2, 2, ]), ]));
    expect(result2).toEqual([ 1, 2, 3, 4, 3, 1, 3, 2, 1, 2, 2, 2, ]);

    const result3 = await lazy()
      .parallel()
      .awaitResolved()
      .flatten()
      .ordered()
      .parallel()
      .awaitResolved()
      .flatten()
      .ordered()
      .reduce()
      .push(sleep(20, [ sleep(30, [ 1, 2, 3, ]), sleep(0, [ 4, 3, 1, ]), ]), sleep(10, [ sleep(5, [ 3, 2, 1, ]), sleep(25, [ 2, 2, 2, ]), ]));
    expect(result3).toEqual([ 1, 2, 3, 4, 3, 1, 3, 2, 1, 2, 2, 2, ]);
  });

  test('every', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .every(it => it>5)
      .push(sleep(10, 6), sleep(15, 10));
    expect(result).toBe(true);
    const result2 = await lazy()
      .parallel()
      .awaitResolved()
      .every(it => it>5)
      .push(sleep(10, 6), sleep(15, 10), sleep(13, 5));
    expect(result2).toBe(false);
  });

  test('some', async () => {
    const result = await lazy()
      .parallel()
      .awaitResolved()
      .some(it => it<5)
      .push(sleep(10, 6), sleep(15, 10));
    expect(result).toBe(false);
    const result2 = await lazy()
      .parallel()
      .awaitResolved()
      .some(it => it<5)
      .push(sleep(10, 6), sleep(15, 10), sleep(13, 4));
    expect(result2).toBe(true);
  });
});
