import { provider, } from '../../';

describe('operator range', () => {

    test('range ACC', async () => {
        const result = await provider.fromRange({ from: 1, to: 10, })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, 2, 3, 4, 5, 6, 7, 8, 9, ]);
    });

    test('range DESC', async () => {
        const result = await provider.fromRange({ from: 10, to: 1, })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 10, 9, 8, 7, 6, 5, 4, 3, 2, ]);
    });

    test('range 1', async () => {
        const result = await provider.fromRange({ from: 1, to: 2, })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 1, ]);
    });

    test('range 0', async () => {
        const result = await provider.fromRange({ from: 1, to: 1, })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ ]);
    });

});
