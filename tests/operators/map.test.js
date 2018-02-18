import { parallel, generator, } from '../../';
import { sleep, } from '../common';

describe('operator map', () => {
    test('map sync with callback', async () => {
        const result = await parallel()
            .map(it => it*2)
            .resolve(1);
        expect(result).toBe(2);
    });

    test('map sync with string', async () => {
        const result = await parallel()
            .map('name')
            .toArray()
            .resolve({ name: 'John', }, { name: 'Lisa', });
        expect(result).toEqual([ 'John', 'Lisa', ]);
    });

    test('map with generator', async () => {
        const result = await generator(async (next, done) => {
            next(await sleep(5, 5));
            Promise.all([ sleep(10, 10).then(next), sleep(20, 20).then(next), ]).then(done);
        }).map(it => it*2)
            .toArray()
            .resolve();
        expect(result).toEqual([ 10, 20, 40, ]);
    });
});
