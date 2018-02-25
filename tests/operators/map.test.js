import { parallel, generator, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator map', () => {
    test('map sync with callback', async () => {
        const result = await parallel()
            .map(it => it*2)
            .resolve(1);
        expect(result).toBe(2);
    });

    test('map with generator', async () => {
        const result = await generator(async function*() {
            yield await sleepAndReturn(5, 5);
            yield await sleepAndReturn(10, 10);
            yield await sleepAndReturn(20, 20);
        }).map(it => it*2)
            .toArray()
            .resolve();
        expect(result).toEqual([ 10, 20, 40, ]);
    });
});
