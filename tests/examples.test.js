const { provider, } = require('../');
const { sleepAndReturn, } = require('./common');

describe('examples', async () => {
    test('parallel map, distinct and filter', async () => {
        const pipe = provider.fromIterable([ 5, 4, 3, 2, 1, 2, 3, 4, 5, ])
            .map(val => sleepAndReturn(val*30, val))
            .await()
            .distinct()
            .map(it => it*2)
            .filter(it => it !== 8)
            .reduce((acc, next) => [ ...acc, next, ], []);
        const result = await pipe.pull();
        expect(result).toEqual([ 2, 4, 6, 10, ]);
    });

    test('flatten with limit example', async () => {
        const names = await provider.fromValue({ firstname: 'John', lastname: 'Doe', })
            .flatten() // optionally flattener can be passed as callback
            .take(2) // stops all downstreams operations when limit is hit
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(names).toEqual([ 'John', 'Doe', ]);
    });

    test('parallel await flatten parallel await flatten', async () => {
        const result = await provider.fromIterable([ sleepAndReturn(100, [ 1, 2, ]), sleepAndReturn(50, [ 8, 1, ]), ])
            .await() // [ 7 ,1 ], [ 1, 2 ]
            .flatten() // 7, 1, 1, 2
            .map(val => sleepAndReturn(val*10, [ val, val*2, ]))
            .await() // [ 1, 2 ], [ 1, 2 ] [ 2, 4 ] [ 6, 18 ]
            .flatten()// 1, 2, 1, 2, 2, 4, 6, 18
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, 2, 1, 2, 2, 4, 8, 16, ]);
    });

    test('map sum', async () => {
        const result = await provider.fromIterable([ 1, 2, 3, ])
            .sum()
            .map(sum => sum*2)
            .pull();
        expect(result).toBe(12);
    });

    test('map single value', async () => {
        const agedJohn = await provider.fromValue({ name: 'John', age: 25, })
            .map(john => ({ ...john, age: john.age+1, }))
            .pull();
        expect(agedJohn).toEqual({ name: 'John', age: 26, });
    });

    test('default example', async () => {
        const result = await provider.fromValue(1)
            .filter(it => it!==1)
            .default('NOT_SET')
            .pull();
        expect(result).toBe('NOT_SET');
    });
});

