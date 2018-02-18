import { parallel, } from '../../';
import { sleep, } from '../common';

describe('operator scan', () => {

    test('scan parallel mutating', async () => {
        const result = await parallel()
            .await()
            .scan((acc, next) => Object.assign(acc, { [next]: true, }), {}) // Wrong way of doing things
            .toArray()
            .resolve(sleep(30, 30), sleep(20, 20));
        expect(result).toEqual([ { 30: true, 20: true, }, { 30: true, 20: true, }, ]);
    });

    test('scan ordered immutable', async () => {
        const result2 = await parallel()
            .await()
            .ordered()
            .scan((acc, next) => ({ ...acc, [next]: true, }), {})
            .toArray()
            .resolve(sleep(30, 30), sleep(20, 20));
        expect(result2).toEqual([ { 30: true, }, { 30: true, 20: true, }, ]);
    });

    test('scan parallel immutable', async () => {
        const result = await parallel()
            .await()
            .scan((acc, next) => ({ ...acc, [next]: true, }), {})
            .toArray()
            .resolve(sleep(30, 30), sleep(20, 20));
        expect(result).toEqual([ { 20: true, }, { 30: true, 20: true, }, ]);
    });

    test('scan parallel take 5', async () => {
        const result2 = await parallel()
            .await()
            .scan((acc, next) => ({ ...acc, [next]: true, }), {})
            .take(5)
            .toArray()
            .resolve(
                sleep(30, 1), // 4
                sleep(30, 2), // 5
                sleep(20, 3), // 2
                sleep(15, 4), // 1
                sleep(30, 5), // 6
                sleep(20, 6), // 3
            );
        expect(result2).toEqual([
            { 4: true, },
            { 3: true, 4: true, },
            { 3: true, 4: true, 6: true, },
            { 1: true, 3: true, 4: true, 6: true, },
            { 1: true, 2: true, 3: true, 4: true, 6: true, },
        ]);
    });
});
