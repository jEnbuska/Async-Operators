const { ordered, parallel, } = require('../');
const { sleep, } = require('./common');

describe('operators', async () => {
  test('map with callback', async () => {
    const result = await ordered()
      .map(it => it*2)
      .resolve(1);
    expect(result).toBe(2);
  });

  test('map with string', async () => {
    const result = await ordered()
      .map('name')
      .toArray()
      .resolve({ name: 'John', }, { name: 'Lisa', });

    expect(result).toEqual([ 'John', 'Lisa', ]);
  });

  test('toArray', async() => {
    const result = await ordered()
      .toArray()
      .resolve(1, 2, 3);
    expect(result).toEqual([ 1, 2, 3, ]);
  });

  test('toSet without picker', async() => {
    const result = await ordered()
      .toSet()
      .resolve(1, 2, 3);
    const set = new Set([ 1, 2, 3, ]);
    expect(result).toEqual(set);
  });

  test('toSet with picker', async() => {
    const result = await ordered()
      .toSet(it => it.name)
      .resolve({ name: 'John', }, { name: 'Lisa', });
    const set = new Set([ 'John', 'Lisa', ]);
    expect(result).toEqual(set);
  });

  test('toObjectSet without picker', async() => {
    const result = await ordered()
      .toObjectSet()
      .resolve(1, 2, 3);
    expect(result).toEqual({ 1: true, 2: true, 3: true, });
  });

  test('toObjectSet with picker', async() => {
    const result = await ordered()
      .toObjectSet(it => it.name)
      .resolve({ name: 'John', }, { name: 'Lisa', });
    expect(result).toEqual({ John: true, Lisa: true, });
  });

  test('toMap without picker', async() => {
    const result = await ordered()
      .toMap()
      .resolve(1, 2, 3);
    const map = new Map();
    map.set(1, 1);
    map.set(2, 2);
    map.set(3, 3, );
    expect(result).toEqual(map);
  });

  test('toMap with picker', async() => {
    const result = await ordered()
      .toMap(it => it.name)
      .resolve({ name: 'John', }, { name: 'Lisa', });
    const map = new Map();
    map.set('John', { name: 'John', });
    map.set('Lisa', { name: 'Lisa', });
    expect(result).toEqual(map);
  });

  test('toMap without picker', async() => {
    const result = await ordered()
      .toMap()
      .resolve(1, 2, 3);
    const map = new Map();
    map.set(1, 1);
    map.set(2, 2);
    map.set(3, 3, );
    expect(result).toEqual(map);
  });

  test('toObject with picker', async() => {
    const result = await ordered()
      .toObject(it => it.name)
      .resolve({ name: 'John', }, { name: 'Lisa', });
    const map = new Map();
    map.set('John', { name: 'John', });
    map.set('Lisa', { name: 'Lisa', });
    expect(result).toEqual({ John: { name: 'John', }, Lisa: { name: 'Lisa', }, });
  });

  test('toObject without picker', async() => {
    const result = await ordered()
      .toObject()
      .resolve(1, 2, 3);
    expect(result).toEqual({ 1: 1, 2: 2, 3: 3, });
  });

  test('filter', async () => {
    const result = await ordered()
      .filter(it => it<2)
      .toArray()
      .resolve(2, 1);
    expect(result).toEqual([ 1, ]);
  });

  test('keys', async() => {
    const result = await ordered()
      .keys()
      .toArray()
      .resolve({ a: 1, b: 2, });
    expect(result).toEqual([ 'a', 'b', ]);
  });

  test('values', async() => {
    const result = await ordered()
      .values()
      .toArray()
      .resolve({ a: 1, b: 2, });
    expect(result).toEqual([ 1, 2, ]);
  });

  test('entries', async() => {
    const result = await ordered()
      .entries()
      .toArray()
      .resolve({ a: 1, b: 2, });
    expect(result).toEqual([ [ 'a', 1, ], [ 'b', 2, ], ]);
  });

  test('reverse', async() => {
    const result = await ordered()
      .reverse()
      .toArray()
      .resolve(1, 2, 3);
    expect(result).toEqual([ 3, 2, 1, ]);
  });

  test('sort without comparator', async() => {
    const result = await ordered()
      .sort()
      .toArray()
      .resolve(3, 1, 2);
    expect(result).toEqual([ 1, 2, 3, ]);
  });

  test('sort with comparator', async() => {
    const result = await ordered()
      .sort((a, b) => a<b ? 1: -1)
      .toArray()
      .resolve(3, 1, 2);
    expect(result).toEqual([ 3, 2, 1, ]);
  });

  test('take', async() => {
    const result = await ordered()
      .take(2)
      .toArray()
      .resolve(3, 1, 2);
    expect(result).toEqual([ 3, 1, ]);
  });

  test('peek', async() => {
    const results = [];
    await ordered()
      .peek(it => results.push(it))
      .resolve(3, 1, 2);
    expect(results).toEqual([ 3, 1, 2, ]);
  });

  test('sum', async() => {
    const result = await ordered()
      .sum()
      .resolve(3, 1, 2);
    expect(result).toBe(3+1+2);
  });

  test('where', async() => {
    const results = await ordered()
      .where({ name: 'John', age: 20, })
      .toArray()
      .resolve({ name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, { name: 'John', age: 25, gender: 'male', });
    expect(results).toEqual([ { name: 'John', age: 20, gender: undefined, }, ]);
  });

  test('await', async() => {
    const results = await ordered()
      .await()
      .toArray()
      .resolve(sleep(10, 10), sleep(5, 5));
    expect(results).toEqual([ 10, 5, ]);
  });

  test('await with mapper', async() => {
    const results = await ordered()
      .await(async (val) => (await val)*2)
      .toArray()
      .resolve(sleep(10, 10), sleep(5, 5));
    expect(results).toEqual([ 20, 10, ]);
  });

  test('parallel', async() => {
    const results = await parallel()
      .await()
      .toArray()
      .resolve(sleep(10, 10), sleep(5, 5));
    expect(results).toEqual([ 5, 10, ]);
  });
  test('default', async() => {
    const results = await parallel()
      .await()
      .filter(it => it>20)
      .default('nothing')
      .resolve(sleep(10, 10), sleep(5, 5));
    expect(results).toBe('nothing');
  });

  test('re-ordered', async() => {
    const results = await parallel()
      .await()
      .ordered()
      .toArray()
      .resolve(sleep(10, 10), sleep(5, 5));
    expect(results).toEqual([ 10, 5, ]);
  });

  test('skip', async() => {
    const results = await ordered()
      .skip(2)
      .toArray()
      .resolve(1, 2, 3);
    expect(results).toEqual([ 3, ]);
  });

  test('take', async() => {
    const results = await ordered()
      .take(2)
      .toArray()
      .resolve(1, 2, 3);
    expect(results).toEqual([ 1, 2, ]);
  });

  test('pick', async() => {
    const result = await ordered()
      .pick('age', 'gender')
      .toArray()
      .resolve({ name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, { name: 'John', age: 25, gender: 'male', });
    expect(result).toEqual([ { age: 20, gender: 'female', }, { age: 20, gender: undefined, }, { age: 25, gender: 'male', }, ]);
  });

  test('distinctBy', async() => {
    const result = await ordered()
      .distinctBy('name')
      .toArray()
      .resolve({ name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, { name: 'John', age: 25, gender: 'male', });
    expect(result).toEqual([ { name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, ]);
  });

  test('distinct', async() => {
    const result = await ordered()
      .distinct()
      .toArray()
      .resolve(1, 2, 4, 1, 2, 5);
    expect(result).toEqual([ 1, 2, 4, 5, ]);
  });

  test('flatten without iterator', async() => {
    const result = await ordered()
      .flatten()
      .filter(it => it!==5)
      .toArray()
      .resolve([ 1, 2, 4, 1, 2, 5, ]);
    expect(result).toEqual([ 1, 2, 4, 1, 2, ]);
  });

  test('flatten with iterator', async() => {
    const result = await ordered()
      .flatten(Object.keys)
      .toArray()
      .resolve({ a: 1, b: 2, c: 4, });
    expect(result).toEqual([ 'a', 'b', 'c', ]);
  });

  test('flatten object without iteraros', async () => {
    const result = await ordered()
      .flatten()
      .toArray()
      .resolve({ a: 1, b: 2, c: 4, });
    expect(result).toEqual([ 1, 2, 4, ]);
  });

  test('every', async () => {
    const result = await ordered()
      .await()
      .every(it => it>5)
      .resolve(sleep(10, 6), sleep(15, 10));
    expect(result).toBe(true);
    const result2 = await ordered()
      .await()
      .every(it => it>5)
      .resolve(6, 10, 5);
    expect(result2).toBe(false);
  });

  test('some', async () => {
    const result = await ordered()
      .parallel()
      .await()
      .some(it => it<5)
      .resolve(sleep(10, 6), sleep(15, 10));
    expect(result).toBe(false);
    const result2 = await ordered()
      .parallel()
      .await()
      .some(it => it<5)
      .resolve(sleep(10, 6), sleep(15, 10), sleep(13, 4), sleep(11, 3));
    expect(result2).toBe(true);
  });

  test('scan synchronous', async () => {
    const result = await ordered()
      .await()
      .scan((acc, next) => Object.assign(acc, { [next]: true, }), {}) // Wrong way of doing things
      .toArray()
      .resolve(sleep(30, 30), sleep(20, 20));
    expect(result).toEqual([ { 30: true, 20: true, }, { 30: true, 20: true, }, ]);
    const result2 = await ordered()
      .await()
      .scan((acc, next) => ({ ...acc, [next]: true, }), {})
      .toArray()
      .resolve(sleep(30, 30), sleep(20, 20));
    expect(result2).toEqual([ { 30: true, }, { 30: true, 20: true, }, ]);
  });

  test('scan parallel', async () => {
    const result = await ordered()
      .parallel()
      .await()
      .scan((acc, next) => ({ ...acc, [next]: true, }), {})
      .toArray()
      .resolve(sleep(30, 30), sleep(20, 20));
    expect(result).toEqual([ { 20: true, }, { 30: true, 20: true, }, ]);
    const result2 = await ordered()
      .parallel()
      .await()
      .scan((acc, next) => ({ ...acc, [next]: true, }), {})
      .take(5)
      .toArray()
      .resolve(
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

  test('reduce', async () => {
    const result = await ordered()
      .parallel()
      .await()
      .reduce((acc, n) => ({ ...acc, [n]: n, }), {})
      .resolve(sleep(30, 30), sleep(20, 20));
    expect(result).toEqual({ 20: 20, 30: 30, });
  });

  test('takeWhile', async () => {
    const result = await ordered()
      .takeWhile(it => it<30)
      .toArray()
      .resolve(1, 2, 3, 25, 30, 40, 5);
    expect(result).toEqual([ 1, 2, 3, 25, ]);
  });

  test('takeUntil', async () => {
    const result = await ordered()
      .takeUntil(it => it===30)
      .toArray()
      .resolve(1, 2, 3, 25, 30, 40, 5);
    expect(result).toEqual([ 1, 2, 3, 25, ]);
  });

  test('skipWhile', async () => {
    const result = await ordered()
      .skipWhile(it => it<30)
      .toArray()
      .resolve(1, 2, 3, 25, 30, 40, 5);
    expect(result).toEqual([ 30, 40, 5, ]);
  });

  test('reject', async () => {
    const result = await ordered()
      .reject(it => it === 2)
      .toArray()
      .resolve(1, 2, 3, 25, 2, 30, 40, 5);
    expect(result).toEqual([ 1, 3, 25, 30, 40, 5, ]);
  });

  test('omit', async () => {
    const result = await ordered()
      .omit('a', 'c')
      .toArray()
      .resolve({ a: 1, b: 2, c: 3, d: 4, }, { a: 5, b: 6, c: 7, d: 8, }, { a: 9, b: 10, c: 11, d: 12, }, { a: 13, b: 14, c: 3, d: 15, });
    expect(result).toEqual([ { b: 2, d: 4, }, { b: 6, d: 8, }, { b: 10, d: 12, }, { b: 14, d: 15, }, ]);
  });

  test('range acceding', async () => {
    const result = await ordered()
      .toArray()
      .range(1, 10);
    expect(result).toEqual([ 1, 2, 3, 4, 5, 6, 7, 8, 9, ]);
  });

  test('range descending', async () => {
    const result = await ordered()
      .toArray()
      .range(10, 1);
    expect(result).toEqual([ 10, 9, 8, 7, 6, 5, 4, 3, 2, ]);
  });
  test('range 1', async () => {
    const result = await ordered()
      .toArray()
      .range(1, 2);
    expect(result).toEqual([ 1, ]);
  });

  test('range empty', async () => {
    const result = await ordered()
      .toArray()
      .range(1, 1);
    expect(result).toEqual([]);
  });

  test('min', async () => {
    const result = await ordered()
      .min()
      .resolve(1, 2, -1, 3);
    expect(result).toBe(-1);
  });

  test('min', async () => {
    const result = await ordered()
      .max()
      .resolve(1, 2, 3, -1, );
    expect(result).toBe(3);
  });

  test('groupBy with string instead callback as param', async () => {
    const result = await ordered()
      .groupBy('name')
      .resolve({ name: 'John', age: 20, }, { name: 'Lisa', age: 30, }, { name: 'John', age: 25, });
    expect(result).toEqual({ John: [ { name: 'John', age: 20, }, { name: 'John', age: 25, }, ], Lisa: [ { name: 'Lisa', age: 30, }, ], });
  });

  test('groupBy with callback function', async () => {
    const result = await ordered()
      .groupBy(next => next.name)
      .resolve({ name: 'John', age: 20, }, { name: 'Lisa', age: 30, }, { name: 'John', age: 25, });
    expect(result).toEqual({ John: [ { name: 'John', age: 20, }, { name: 'John', age: 25, }, ], Lisa: [ { name: 'Lisa', age: 30, }, ], });
  });

  test('keep with callback function', async () => {
    const result = await ordered()
      .keep(({ length, }) => ({ length, }))
      .flatten()
      .filter(person => person.age< 30)
      .map((it, { length, }) => ({ ...it, length, }))
      .toArray()
      .resolve([ { name: 'John', age: 20, }, { name: 'Lisa', age: 30, }, { name: 'John', age: 25, }, ]);
    expect(result).toEqual([
      { name: 'John', age: 20, length: 3, },
      { name: 'John', age: 25, length: 3, }, ]);
  });

  test('keep with string param', async () => {
    const result = await ordered()
      .keep('length')
      .flatten()
      .filter(person => person.age< 30)
      .map((it, { length, }) => ({ ...it, length, }))
      .toArray()
      .resolve([ { name: 'John', age: 20, }, { name: 'Lisa', age: 30, }, { name: 'John', age: 25, }, ]);
    expect(result).toEqual([
      { name: 'John', age: 20, length: 3, },
      { name: 'John', age: 25, length: 3, }, ]);
  });
});

