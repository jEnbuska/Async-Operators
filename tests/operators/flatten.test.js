import { provider, } from '../../';

describe('operator flatten', () => {

    test('flatten without iterator', async() => {
        const result = await provider({ value: [ 1, 2, 4, 1, 2, 5, ], })
            .flatten()
            .filter(it => it!==5)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, 2, 4, 1, 2, ]);
    });

    test('flatten with iterator', async() => {
        const result = await provider({ value: { a: 1, b: 2, c: 4, }, })
            .flatten(Object.keys)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 'a', 'b', 'c', ]);
    });

    test('flatten object without iteterator', async () => {
        const result = await provider({ value: { a: 1, b: 2, c: 4, }, })
            .flatten()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, 2, 4, ]);
    });
});
