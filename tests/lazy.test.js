import lazy from '../src/Lazy';

async function sleep(time, result) {
  return new Promise(res => setTimeout(() => {
    res(result);
  }, time));
}
// TEST 'skip'
describe('lazy', async () => {
  test('object as keys', async function () {
    const obj = {};
    obj[([ 1, ])] = 1;
    obj[([ 1, 2, ])] = 2;
  });

  test('where synchronous', async function () {
    const [ first, second, third, ]= await lazy()
      .resolve()
      .where({ a: 1, })
      .reduce()
      .invoke(sleep(30, { a: 1, b: 1, }), sleep(20, { a: 1, b: 2, }), sleep(25, { a: 2, b: 1, }));

    expect(first).toEqual({ a: 1, b: 1, });
    expect(second).toEqual({ a: 1, b: 2, });
    expect(third).toBeUndefined();
  });
  test('where parallel', async function () {
    const [ first, second, third, ]= await lazy()
      .parallel()
      .resolve()
      .where({ a: 1, })
      .reduce()
      .invoke(sleep(30, { a: 1, b: 1, }), sleep(20, { a: 1, b: 2, }), sleep(25, { a: 2, b: 1, }));

    expect(first).toEqual({ a: 1, b: 2, });
    expect(second).toEqual({ a: 1, b: 1, });
    expect(third).toBeUndefined();
  });

  test('skip synchronous', async function () {
    const [ first, second, ]= await lazy()
      .resolve()
      .where({ a: 1, })
      .skip(1)
      .reduce()
      .invoke(sleep(30, { a: 1, b: 1, }), sleep(20, { a: 1, b: 2, }), sleep(25, { a: 2, b: 1, }));

    expect(first).toEqual({ a: 1, b: 2, });
    expect(second).toBeUndefined();
  });
  test('skip parallel', async function () {
    const [ first, second, ]= await lazy()
      .parallel()
      .resolve()
      .where({ a: 1, })
      .skip(1)
      .reduce()
      .invoke(sleep(30, { a: 1, b: 1, }), sleep(20, { a: 1, b: 2, }), sleep(15, { a: 2, b: 1, }));

    expect(first).toEqual({ a: 1, b: 1, });
    expect(second).toBeUndefined();
  });

  test('reduce synchronous', async function () {
    const [ first, second, ]= await lazy()
      .resolve()
      .reduce()
      .invoke(sleep(30, 30), sleep(20, 20));
    expect(first).toBe(30);
    expect(second).toBe(20);
  });

  test('take synchronous', async function () {
    const [ first, second, ]= await lazy()
      .resolve()
      .take(2)
      .reduce()
      .invoke(sleep(30, 30), sleep(20, 20), sleep(10, 10));
    expect(first).toBe(30);
    expect(second).toBe(20);
  });

  test('take parallel', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .take(3)
      .reduce()
      .invoke(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }), // 2
        sleep(15, { name: 'Lisa', age: 30, }), // 1
        sleep(30, { name: 'Kim', age: 40, }),
        sleep(20, { name: 'Ted', age: 50, }), // 3
      );
    expect(result).toEqual([ { name: 'Lisa', age: 30, }, { name: 'John', age: 20, }, { name: 'Ted', age: 50, }, ]);
  });

  test('parallel take last', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .takeLast()
      .invoke(sleep(30, 30), sleep(20, 20));
    expect(result).toBe(30);
  });

  test('map', async function () {
    const [ first, second, ] = await lazy()
      .resolve()
      .map(it => it*2)
      .reduce()
      .invoke(sleep(30, 30), sleep(20, 20));
    expect(first).toBe(60);
    expect(second).toBe(40);
  });

  test('scan synchronous', async function () {
    const result = await lazy()
      .resolve()
      .scan((acc = {}, next) => Object.assign(acc, { [next]: true, }))
      .takeLast()
      .invoke(sleep(30, 30), sleep(20, 20));
    expect(result).toEqual({ 30: true, 20: true, });
    const result2 = await lazy()
      .resolve()
      .scan((acc = {}, next) => ({ ...acc, [next]: true, }))
      .reduce()
      .invoke(sleep(30, 30), sleep(20, 20));
    expect(result2).toEqual([ { 30: true, }, { 30: true, 20: true, }, ]);
  });

  test('scan parallel', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .scan((acc = {}, next) => ({ ...acc, [next]: true, }))
      .reduce()
      .invoke(sleep(30, 30), sleep(20, 20));
    expect(result).toEqual([ { 20: true, }, { 30: true, 20: true, }, ]);
    const result2 = await lazy()
      .parallel()
      .resolve()
      .scan((acc = {}, next) => ({ ...acc, [next]: true, }))
      .take(5)
      .reduce()
      .invoke(
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

  test('sum parallel', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .sum()
      .invoke(sleep(30, 30), sleep(20, 20));
    expect(result).toBe(50);
  });

  test('distinctBy parallel', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .distinctBy('name')
      .reduce()
      .invoke(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }),
        sleep(15, { name: 'Lisa', age: 30, })
      );
    expect(result).toEqual([ { name: 'Lisa', age: 30, }, { name: 'John', age: 20, }, ]);
  });

  test('filter parallel', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .filter(({ age, }) => age>=25)
      .reduce()
      .invoke(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }),
        sleep(15, { name: 'Lisa', age: 30, })
      );
    expect(result).toEqual([ { name: 'Lisa', age: 30, }, { name: 'John', age: 25, }, ]);
  });

  test('peek parallel', async function () {
    const ages = [];
    await lazy()
      .parallel()
      .map(async res => await res)
      .peek(({ age, }) => ages.push(age))
      .distinctBy('name')
      .peek(({ age, }) => ages.push(age))
      .reduce()
      .invoke(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }),
        sleep(15, { name: 'Lisa', age: 30, })
      );
    expect(ages).toEqual([ 30, 30, 20, 20, 25, ]);
  });

  test('skipWhile takeUntil synchronous', async function () {
    const result = await lazy()
      .resolve()
      .takeUntil(it => it<5)
      .skipWhile(it => it<2)
      .reduce()
      .invoke(
        sleep(30, 0),
        sleep(30, 1),
        sleep(20, 2),
        sleep(15, 3),
        sleep(30, 4),
        sleep(20, 5),
      );
    expect(result).toEqual([ 2, 3, 4, ]);
  });

  test('skipWhile takeUntil parallel', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .takeUntil(it => it<5)
      .skipWhile(it => it<2)
      .reduce()
      .invoke(
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

  test('pick parallel', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .pick('a', 'b')
      .reduce()
      .invoke(
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

  test('parallel ordered', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .pick('a', 'b')
      .ordered()
      .reduce()
      .invoke(
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
});
