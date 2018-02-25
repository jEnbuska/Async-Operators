import { parallel, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator flatten', () => {

    test('flatten without iterator', async() => {
        const result = await parallel()
            .flatten()
            .filter(it => it!==5)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve([ 1, 2, 4, 1, 2, 5, ]);
        expect(result).toEqual([ 1, 2, 4, 1, 2, ]);
    });

    test('flatten with iterator', async() => {
        const result = await parallel()
            .flatten(Object.keys)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve({ a: 1, b: 2, c: 4, });
        expect(result).toEqual([ 'a', 'b', 'c', ]);
    });

    test('flatten object without iteterator', async () => {
        const result = await parallel()
            .flatten()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve({ a: 1, b: 2, c: 4, });
        expect(result).toEqual([ 1, 2, 4, ]);
    });
});
