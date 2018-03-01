import { provider, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator map', () => {
    test('map sync with callback', async () => {
        const result = await provider({ value: 1, })
            .map(it => it*2)
            .pull();
        expect(result).toBe(2);
    });

    test('map with generator', async () => {
        const result = await provider({
            async *generator () {
                yield await sleepAndReturn(5, 5);
                yield await sleepAndReturn(10, 10);
                yield await sleepAndReturn(20, 20);
            },
        }).map(it => it*2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 10, 20, 40, ]);
    });
});
