import { provider, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator scan', () => {

    test('scan parallel mutating', async () => {
        const result = await provider.fromIterable([ sleepAndReturn(30, 30), sleepAndReturn(20, 20), ])
            .await()
            .scan((acc, next) => Object.assign(acc, { [next]: true, }), {}) // Wrong way of doing things
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ { 30: true, 20: true, }, { 30: true, 20: true, }, ]);
    });

    test('scan ordered immutable', async () => {
        const result2 = await provider.fromIterable([ sleepAndReturn(30, 30), sleepAndReturn(20, 20), ])

            .await()
            .ordered()
            .scan((acc, next) => ({ ...acc, [next]: true, }), {})
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result2).toEqual([ { 30: true, }, { 30: true, 20: true, }, ]);
    });

    test('scan parallel immutable', async () => {
        const result = await provider.fromIterable([ sleepAndReturn(30, 30), sleepAndReturn(20, 20), ])
            .await()
            .scan((acc, next) => ({ ...acc, [next]: true, }), {})
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ { 20: true, }, { 30: true, 20: true, }, ]);
    });

    test('scan parallel take 5', async () => {
        const result2 = await provider.fromIterable([
            sleepAndReturn(30, 1), // 4
            sleepAndReturn(30, 2), // 5
            sleepAndReturn(20, 3), // 2
            sleepAndReturn(15, 4), // 1
            sleepAndReturn(30, 5), // 6
            sleepAndReturn(20, 6), // 3
        ])
            .await()
            .scan((acc, next) => ({ ...acc, [next]: true, }), {})
            .take(5)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result2).toEqual([
            { 4: true, },
            { 3: true, 4: true, },
            { 3: true, 4: true, 6: true, },
            { 1: true, 3: true, 4: true, 6: true, },
            { 1: true, 2: true, 3: true, 4: true, 6: true, },
        ]);
    });
});
