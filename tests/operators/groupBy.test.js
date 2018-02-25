import { parallel, } from '../../';

describe('operator groupBy', () => {

    test('groupBy with string instead callback as param', async () => {
        const result = await parallel()
            .groupBy('name')
            .resolve({ name: 'John', age: 20, }, { name: 'Lisa', age: 30, }, { name: 'John', age: 25, });
        expect(result).toEqual({ John: [ { name: 'John', age: 20, }, { name: 'John', age: 25, }, ], Lisa: [ { name: 'Lisa', age: 30, }, ], });
    });

    test('groupBy with multiple arguments', async () => {
        const result = await parallel()
            .groupBy('gender', 'age', 'salary')
            .resolve(
                { gender: 1, name: 'John', age: 20, salary: 2500, },
                { gender: 0, name: 'Lisa', age: 35, salary: 3300, },
                { gender: 1, name: 'Matt', age: 30, salary: 3500, },
                { gender: 1, name: 'Tim', age: 20, salary: 1500, },
                { gender: 1, name: 'Kim', age: 30, salary: 3500, },
                { gender: 0, name: 'Mary', age: 25, salary: 3300, });
        expect(result).toEqual(
            { 1: {
                20: {
                    2500: [ { gender: 1, name: 'John', age: 20, salary: 2500, }, ],
                    1500: [ { gender: 1, name: 'Tim', age: 20, salary: 1500, }, ],
                },
                30: {
                    3500: [ { gender: 1, name: 'Matt', age: 30, salary: 3500, }, { gender: 1, name: 'Kim', age: 30, salary: 3500, }, ],
                },
            }, 0: {
                35: {
                    3300: [ { gender: 0, name: 'Lisa', age: 35, salary: 3300, }, ],
                },
                25: {
                    3300: [ { gender: 0, name: 'Mary', age: 25, salary: 3300, }, ],
                },
            },
            });
    });

});
