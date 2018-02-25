import { parallel, } from '../../';

describe('operator sort', () => {

    test('sort without comparator', async() => {
        const result = await parallel()
            .sort()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve(3, 1, 2);
        expect(result).toEqual([ 1, 2, 3, ]);
    });

    test('sort with comparator function', async() => {
        const result = await parallel()
            .sort((a, b) => a<b ? 1: -1)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve(3, 1, 2);
        expect(result).toEqual([ 3, 2, 1, ]);
    });

    test('sortBy multiple secondary object ASC comparisons', async() => {
        const result = await parallel()
            .sortBy({ age: 'ASC', income: 'ASC', gender: 'ASC', })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve(
                { name: 'John', age: 25, gender: 1, income: 3000, },
                { name: 'Jane', age: 30, gender: 0, income: 3700, },
                { name: 'Matt', age: 40, gender: 1, income: 3450, },
                { name: 'Bill', age: 30, gender: 1, income: 3000, },
                { name: 'Andrew', age: 44, gender: 1, income: 3750, },
                { name: 'Laura', age: 44, gender: 0, income: 3750, }
            );
        expect(result).toEqual([
            { age: 25, gender: 1, income: 3000, name: 'John', },
            { age: 30, gender: 1, income: 3000, name: 'Bill', },
            { age: 30, gender: 0, income: 3700, name: 'Jane', },
            { age: 40, gender: 1, income: 3450, name: 'Matt', },
            { age: 44, gender: 0, income: 3750, name: 'Laura', },
            { age: 44, gender: 1, income: 3750, name: 'Andrew', },
        ]);
    });

    test('sortBy multiple secondary object DESC comparisons', async() => {
        const result = await parallel()
            .sortBy({ age: 'DESC', income: 'DESC', gender: 'DESC', })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve(
                { name: 'John', age: 25, gender: 1, income: 3000, },
                { name: 'Jane', age: 30, gender: 0, income: 3700, },
                { name: 'Matt', age: 40, gender: 1, income: 3450, },
                { name: 'Bill', age: 30, gender: 1, income: 3000, },
                { name: 'Andrew', age: 44, gender: 1, income: 3750, },
                { name: 'Laura', age: 44, gender: 0, income: 3750, }
            );
        expect(result).toEqual([
            { age: 44, gender: 1, income: 3750, name: 'Andrew', },
            { age: 44, gender: 0, income: 3750, name: 'Laura', },
            { age: 40, gender: 1, income: 3450, name: 'Matt', },
            { age: 30, gender: 0, income: 3700, name: 'Jane', },
            { age: 30, gender: 1, income: 3000, name: 'Bill', },
            { age: 25, gender: 1, income: 3000, name: 'John', },
        ]);
    });
});
