import { provider, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator map', () => {
    test('map sync with callback', async () => {
        const result = await provider.fromValue(1)
            .map(it => it*2)
            .pull();
        expect(result).toBe(2);
    });

    test('map with generator', async () => {
        const result = await provider.fromGenerator(
            async function *generator () {
                yield await sleepAndReturn(5, 5);
                yield await sleepAndReturn(10, 10);
                yield await sleepAndReturn(20, 20);
            }).map(it => it*2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 10, 20, 40, ]);
    });

    test('omit object with generator', async () => {
        const result = await provider.fromValue({ a: 1, b: 2, })
            .omit([ 'a', ])
            .pull();
        expect(result).toEqual({ b: 2, });
    });
    test('omit array with generator', async () => {
        const result = await provider.fromValue([ 1, 2, 3, 4, 5, ])
            .omit([ 0, 3, ])
            .pull();
        expect(result).toEqual([ 2, 3, 5, ]);
    });
});
