const { parallel, } = require('../');
const { sleepAndReturn, } = require('./common');

describe('examples', async () => {
    test('parallel map, distinct and filter', async () => {
        const pipe = parallel()
            .map(val => sleepAndReturn(val*30, val))
            .await()
            .distinct()
            .map(it => it*2)
            .filter(it => it !== 8)
            .reduce((acc, next) => [ ...acc, next, ], []);
        const result = await pipe.resolve(5, 4, 3, 2, 1, 2, 3, 4, 5);
        expect(result).toEqual([ 2, 4, 6, 10, ]);
        const result2 = await pipe.resolve(4, 3, 2, 1);
        expect(result2).toEqual([ 2, 4, 6, ]);
    });

    test('flatten with limit example', async () => {
        const pipe = parallel()
            .flatten() // optionally flattener can be passed as callback
            .take(2); // stops all downstreams operations when limit is hit

        const names = await  pipe
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve({ firstname: 'John', lastname: 'Doe', });

        expect(names).toEqual([ 'John', 'Doe', ]);

        const firstTwoNumbers = await pipe
            .forEach(it => console.log(it))
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve([ 1, ],  [ 2, 3, ], [ 4, 5, 6, ]);
        expect(firstTwoNumbers).toEqual([ 1, 2, ]);
    });

    test('parallel await flatten parallel await flatten', async () => {
        const result = await parallel()
            .await() // [ 7 ,1 ], [ 1, 2 ]
            .flatten() // 7, 1, 1, 2
            .map(val => sleepAndReturn(val*10, [ val, val*2, ]))
            .parallel()
            .await() // [ 1, 2 ], [ 1, 2 ] [ 2, 4 ] [ 6, 18 ]
            .flatten()// 1, 2, 1, 2, 2, 4, 6, 18
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve(sleepAndReturn(100, [ 1, 2, ]), sleepAndReturn(50, [ 8, 1, ]));
        expect(result).toEqual([ 1, 2, 1, 2, 2, 4, 8, 16, ]);
    });

    test('map sum', async () => {
        const result = await parallel()
            .sum()
            .map(sum => sum*2).resolve(1, 2, 3);
        expect(result).toBe(12);
    });

    test('map single value', async () => {
        const agedJohn = await parallel()
            .map(john => ({ ...john, age: john.age+1, }))
            .resolve({ name: 'John', age: 25, });
        expect(agedJohn).toEqual({ name: 'John', age: 26, });
    });

    test('flow control', async () => {
        const pipe = parallel().take(1);
        const [ a, b, ]= await Promise.all([ pipe.resolve(1), pipe.resolve(2), ]);
        expect({ a, b, }).toEqual({ a: 1, b: 2, });
    });

    test('default example', async () => {
        const result = await parallel()
            .filter(it => it!==1)
            .default('NOT_SET')
            .resolve(1);
        expect(result).toBe('NOT_SET');
    });
});

