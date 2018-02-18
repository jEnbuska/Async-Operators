import { parallel, } from '../../';
import { sleepAndReturn, } from '../common';

describe('misc tests', () => {

    test('toArray', async() => {
        const result = await parallel()
            .toArray()
            .resolve(1, 2, 3);
        expect(result).toEqual([ 1, 2, 3, ]);
    });

    test('filter', async () => {
        const result = await parallel()
            .filter(it => it<2)
            .toArray()
            .resolve(2, 1);
        expect(result).toEqual([ 1, ]);
    });

    test('keys', async() => {
        const result = await parallel()
            .keys()
            .toArray()
            .resolve({ a: 1, b: 2, });
        expect(result).toEqual([ 'a', 'b', ]);
    });

    test('values', async() => {
        const result = await parallel()
            .values()
            .toArray()
            .resolve({ a: 1, b: 2, });
        expect(result).toEqual([ 1, 2, ]);
    });

    test('entries', async() => {
        const result = await parallel()
            .entries()
            .toArray()
            .resolve({ a: 1, b: 2, });
        expect(result).toEqual([ [ 'a', 1, ], [ 'b', 2, ], ]);
    });

    test('reverse', async() => {
        const result = await parallel()
            .reverse()
            .toArray()
            .resolve(1, 2, 3);
        expect(result).toEqual([ 3, 2, 1, ]);
    });

    test('where', async() => {
        const results = await parallel()
            .where({ name: 'John', age: 20, })
            .toArray()
            .resolve({ name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, { name: 'John', age: 25, gender: 'male', });
        expect(results).toEqual([ { name: 'John', age: 20, gender: undefined, }, ]);
    });

    test('default', async() => {
        const results = await parallel()
            .await()
            .filter(it => it>20)
            .default('nothing')
            .resolve(sleepAndReturn(10, 10), sleepAndReturn(5, 5));
        expect(results).toBe('nothing');
    });

    test('skip', async() => {
        const results = await parallel()
            .skip(2)
            .toArray()
            .resolve(1, 2, 3);
        expect(results).toEqual([ 3, ]);
    });

    test('take', async() => {
        const results = await parallel()
            .take(2)
            .toArray()
            .resolve(1, 2, 3);
        expect(results).toEqual([ 1, 2, ]);
    });

    test('pick', async() => {
        const result = await parallel()
            .pick('age', 'gender')
            .toArray()
            .resolve({ name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, { name: 'John', age: 25, gender: 'male', });
        expect(result).toEqual([ { age: 20, gender: 'female', }, { age: 20, gender: undefined, }, { age: 25, gender: 'male', }, ]);
    });

    test('distinctBy one key', async() => {
        const result = await parallel()
            .distinctBy('name')
            .toArray()
            .resolve({ name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, { name: 'John', age: 25, gender: 'male', });
        expect(result).toEqual([ { name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, ]);
    });

    test('distinctBy multipleKeys', async() => {
        const result = await parallel()
            .distinctBy('name', 'age')
            .toArray()
            .resolve({ name: 'Lisa', age: 20, }, { name: 'Lisa', age: 20, }, { name: 'Lisa', age: 25, });
        expect(result).toEqual([ { name: 'Lisa', age: 20, }, { name: 'Lisa', age: 25, }, ]);
    });

    test('distinctBy multipleKeys', async() => {
        const result = await parallel()
            .distinctBy('name', 'age')
            .toArray()
            .resolve({ name: 'Lisa', age: 20, }, { name: 'Lisa', age: 20, }, { name: 'Lisa', age: 25, });
        expect(result).toEqual([ { name: 'Lisa', age: 20, }, { name: 'Lisa', age: 25, }, ]);
    });

    test('distinct', async() => {
        const result = await parallel()
            .distinct()
            .toArray()
            .resolve(1, 2, 4, 1, 2, 5);
        expect(result).toEqual([ 1, 2, 4, 5, ]);
    });

    test('reduce', async () => {
        const result = await parallel()
            .parallel()
            .await()
            .reduce((acc, n) => ({ ...acc, [n]: n, }), {})
            .resolve(sleepAndReturn(30, 30), sleepAndReturn(20, 20));
        expect(result).toEqual({ 20: 20, 30: 30, });
    });

    test('takeWhile', async () => {
        const result = await parallel()
            .takeWhile(it => it<30)
            .toArray()
            .resolve(1, 2, 3, 25, 30, 40, 5);
        expect(result).toEqual([ 1, 2, 3, 25, ]);
    });

    test('takeUntil', async () => {
        const result = await parallel()
            .takeUntil(it => it===30)
            .toArray()
            .resolve(1, 2, 3, 25, 30, 40, 5);
        expect(result).toEqual([ 1, 2, 3, 25, ]);
    });

    test('skipWhile', async () => {
        const result = await parallel()
            .skipWhile(it => it<30)
            .toArray()
            .resolve(1, 2, 3, 25, 30, 40, 5);
        expect(result).toEqual([ 30, 40, 5, ]);
    });

    test('reject', async () => {
        const result = await parallel()
            .reject(it => it === 2)
            .toArray()
            .resolve(1, 2, 3, 25, 2, 30, 40, 5);
        expect(result).toEqual([ 1, 3, 25, 30, 40, 5, ]);
    });

    test('omit', async () => {
        const result = await parallel()
            .omit('a', 'c')
            .toArray()
            .resolve({ a: 1, b: 2, c: 3, d: 4, }, { a: 5, b: 6, c: 7, d: 8, }, { a: 9, b: 10, c: 11, d: 12, }, { a: 13, b: 14, c: 3, d: 15, });
        expect(result).toEqual([ { b: 2, d: 4, }, { b: 6, d: 8, }, { b: 10, d: 12, }, { b: 14, d: 15, }, ]);
    });

    test('min', async () => {
        const result = await parallel()
            .min()
            .resolve(1, 2, -1, 3);
        expect(result).toBe(-1);
    });

    test('min', async () => {
        const result = await parallel()
            .max()
            .resolve(1, 2, 3, -1, );
        expect(result).toBe(3);
    });
});
