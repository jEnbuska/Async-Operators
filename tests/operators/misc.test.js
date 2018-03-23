import { provider, } from '../../';
import { sleepAndReturn, } from '../common';

describe('misc tests', () => {

    test('reduce', async() => {
        const result = await provider({ flatten: [ 1, 2, 3, ], })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, 2, 3, ]);
    });

    test('filter', async () => {
        const result = await provider({ flatten: [ 2, 1, ], })
            .filter(it => it<2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, ]);
    });

    test('keys', async() => {
        const result = await provider({ map: { a: 1, b: 2, }, })
            .keys()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 'a', 'b', ]);
    });

    test('values', async() => {
        const result = await provider({ map: { a: 1, b: 2, }, })
            .values()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, 2, ]);
    });

    test('entries', async() => {
        const result = await provider({ map: { a: 1, b: 2, }, })
            .entries()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ [ 'a', 1, ], [ 'b', 2, ], ]);
    });

    test('reverse', async() => {
        const result = await provider({ flatten: [ 1, 2, 3, ], })
            .reverse()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 3, 2, 1, ]);
    });

    test('where', async() => {
        const results = await provider({ flatten: [ { name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, { name: 'John', age: 25, gender: 'male', }, ], })
            .where({ name: 'John', age: 20, })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ { name: 'John', age: 20, gender: undefined, }, ]);
    });

    test('default', async() => {
        const results = await provider({ flatten: [ sleepAndReturn(10, 10), sleepAndReturn(5, 5), ], })
            .await()
            .filter(it => it>20)
            .default('nothing')
            .pull();
        expect(results).toBe('nothing');
    });

    test('skip', async() => {
        const results = await provider({ flatten: [ 1, 2, 3, ], })
            .skip(2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ 3, ]);
    });

    test('take', async() => {
        const results = await provider({ flatten: [ 1, 2, 3, ], })
            .take(2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ 1, 2, ]);
    });

    test('pick', async() => {
        const result = await provider({ flatten: [ { name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, { name: 'John', age: 25, gender: 'male', }, ], })
            .pick([ 'age', 'gender', ])
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ { age: 20, gender: 'female', }, { age: 20, gender: undefined, }, { age: 25, gender: 'male', }, ]);
    });

    test('distinctBy one key', async() => {
        const result = await provider({ flatten: [ { name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, { name: 'John', age: 25, gender: 'male', }, ], })
            .distinctBy([ 'name', ])
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ { name: 'Lisa', age: 20, gender: 'female', }, { name: 'John', age: 20, gender: undefined, }, ]);
    });

    test('distinctBy multipleKeys', async() => {
        const result = await provider({ flatten: [ { name: 'Lisa', age: 20, }, { name: 'Lisa', age: 20, }, { name: 'Lisa', age: 25, }, ], })
            .distinctBy([ 'name', 'age', ])
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ { name: 'Lisa', age: 20, }, { name: 'Lisa', age: 25, }, ]);
    });

    test('distinctBy multipleKeys', async() => {
        const result = await provider({ flatten: [ { name: 'Lisa', age: 20, }, { name: 'Lisa', age: 20, }, { name: 'Lisa', age: 25, }, ], })
            .distinctBy([ 'name', 'age', ])
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ { name: 'Lisa', age: 20, }, { name: 'Lisa', age: 25, }, ]);
    });

    test('distinct', async() => {
        const result = await provider({ flatten: [ 1, 2, 4, 1, 2, 5, ], })
            .distinct()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, 2, 4, 5, ]);
    });

    test('reduce', async () => {
        const result = await provider({ flatten: [ sleepAndReturn(30, 30), sleepAndReturn(20, 20), ], })
            .await()
            .reduce((acc, n) => ({ ...acc, [n]: n, }), {})
            .pull();
        expect(result).toEqual({ 20: 20, 30: 30, });
    });

    test('takeWhile', async () => {
        const result = await provider({ flatten: [ 1, 2, 3, 25, 30, 40, 5, ], })
            .takeWhile(it => it<30)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, 2, 3, 25, ]);
    });

    test('takeUntil', async () => {
        const result = await provider({ flatten: [ 1, 2, 3, 25, 30, 40, 5, ], })
            .takeUntil(it => it===30)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, 2, 3, 25, ]);
    });

    test('skipWhile', async () => {
        const result = await provider({ flatten: [ 1, 2, 3, 25, 30, 40, 5, ], })
            .skipWhile(it => it<30)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 30, 40, 5, ]);
    });

    test('reject', async () => {
        const result = await provider({ flatten: [ 1, 2, 3, 25, 2, 30, 40, 5, ], })
            .reject(it => it === 2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, 3, 25, 30, 40, 5, ]);
    });

    test('omit', async () => {
        const result = await provider({ flatten: [ { a: 1, b: 2, c: 3, d: 4, }, { a: 5, b: 6, c: 7, d: 8, }, { a: 9, b: 10, c: 11, d: 12, }, { a: 13, b: 14, c: 3, d: 15, }, ], })
            .omit([ 'a', 'c', ])
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ { b: 2, d: 4, }, { b: 6, d: 8, }, { b: 10, d: 12, }, { b: 14, d: 15, }, ]);
    });

    test('min', async () => {
        const result = await provider({ flatten: [ 1, -1, 3, 2, ], })
            .min()
            .pull();
        expect(result).toBe(-1);
    });

    test('max', async () => {
        const result = await provider({ flatten: [ 1, 2, 3, -1, ], })
            .max()
            .pull();
        expect(result).toBe(3);
    });
});
