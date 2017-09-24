import lazy from '../src/Lazy';

const SUBJECT_A = 'SUBJECT_A';
const SUBJECT_B = 'SUBJECT_B';
const SUBJECT_C = 'SUBJECT_C';
const SUBJECT_D = 'SUBJECT_D';

async function sleep(time, result) {
  return new Promise(res => setTimeout(() => {
    res(result);
  }, time));
}

describe('lazy', async () => {
  test('takeAll', async function () {
    const [ first, second, ]= await lazy()
      .takeAll()
      .apply(sleep(30, 30), sleep(20, 20));
    expect(first).toBe(30);
    expect(second).toBe(20);
  });

  test('takeLast', async function () {
    const last = await lazy()
      .takeLast()
      .apply(sleep(30, 30), sleep(20, 20));
    expect(last).toBe(20);
  });

  test('take', async function () {
    const [ first, second, ]= await lazy()
      .take(2)
      .apply(sleep(30, 30), sleep(20, 20), sleep(10, 10));
    expect(first).toBe(30);
    expect(second).toBe(20);
  });

  test('map', async function () {
    const [ first, second, ] = await lazy()
      .resolve()
      .map(it => it*2)
      .takeAll()
      .apply(sleep(30, 30), sleep(20, 20));
    expect(first).toBe(60);
    expect(second).toBe(40);
  });

  test('parallel take last', async function () {
    const result = await lazy()
      .parallel()
      .takeLast()
      .apply(sleep(30, 30), sleep(20, 20));
    expect(result).toBe(30);
  });

  test('scan', async function () {
    const result = await lazy()
      .resolve()
      .scan((acc = {}, next, i) => Object.assign(acc, { [i]: next, }))
      .takeLast()
      .apply(sleep(30, 30), sleep(20, 20));
    expect(result).toEqual({ 0: 30, 1: 20, });
    const result2 = await lazy()
      .resolve()
      .scan((acc = {}, next, i) => ({ ...acc, [i]: next, }))
      .takeAll()
      .apply(sleep(30, 30), sleep(20, 20));
    expect(result2).toEqual([ { 0: 30, }, { 0: 30, 1: 20, }, ]);
    const result3 = await lazy()
      .parallel()
      .resolve()
      .scan((acc = {}, next, i) => ({ ...acc, [i]: next, }))
      .takeAll()
      .apply(sleep(30, 30), sleep(20, 20));
    expect(result3).toEqual([ { 1: 20, }, { 0: 30, 1: 20, }, ]);
  });

  test('sum', async function () {
    const result = await lazy()
      .parallel()
      .sum()
      .apply(sleep(30, 30), sleep(20, 20));
    expect(result).toBe(50);
  });

  test('distinctBy', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .distinctBy('name')
      .takeAll()
      .apply(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }),
        sleep(15, { name: 'Lisa', age: 30, })
      );
    expect(result).toEqual([ { name: 'Lisa', age: 30, }, { name: 'John', age: 20, }, ]);
  });

  test('filter', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .filter(({ age, }) => age>=25)
      .takeAll()
      .apply(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }),
        sleep(15, { name: 'Lisa', age: 30, })
      );
    expect(result).toEqual([ { name: 'Lisa', age: 30, }, { name: 'John', age: 25, }, ]);
  });

  test('peek', async function () {
    const ages = [];
    await lazy()
      .parallel()
      .resolve()
      .peek(({ age, }) => ages.push(age))
      .distinctBy('name')
      .peek(({ age, }) => ages.push(age))
      .takeAll()
      .apply(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }),
        sleep(15, { name: 'Lisa', age: 30, })
      );
    expect(ages).toEqual([ 30, 30, 20, 20, 25, ]);
  });

  test('take', async function () {
    const result = await lazy()
      .parallel()
      .resolve()
      .take(3)
      .apply(
        sleep(30, { name: 'John', age: 25, }),
        sleep(20, { name: 'John', age: 20, }),
        sleep(15, { name: 'Lisa', age: 30, }),
        sleep(30, { name: 'Kim', age: 40, }),
      sleep(20, { name: 'Ted', age: 50, }),
      );
    expect(result).toEqual([ { name: 'Lisa', age: 30, }, { name: 'John', age: 20, }, { name: 'Ted', age: 50, }, ]);
  });

  test('skipWhile takeUntil', async function () {
    const result = await lazy()
      .map()
      .takeUntil(it => it<5)
      .skipWhile(it => it<2)
      .takeAll()
      .apply(
        sleep(30, 0),
        sleep(30, 1),
        sleep(20, 2),
        sleep(15, 3),
        sleep(30, 4),
        sleep(20, 5),
      );
    expect(result).toEqual([ 2, 3, 4, ]);
  });
});
