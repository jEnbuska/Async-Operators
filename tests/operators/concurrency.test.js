import { provider, } from '../../';
import { sleepAndReturn, } from '../common';

describe('concurrency operators ', () => {

    test('ordered iterate await', async() => {
        const results = await provider({ flatten: [ sleepAndReturn(10, 10), sleepAndReturn(5, 5), ], })
            .await()
            .ordered()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ 10, 5, ]);
    });

    test('parallel iterate await', async() => {
        const results = await provider({ flatten: [ sleepAndReturn(10, 10), sleepAndReturn(5, 5), ], })
            .await()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ 5, 10, ]);
    });

    test('re-continued await', async() => {
        const results = await provider({ flatten: [ sleepAndReturn(10, 10), sleepAndReturn(5, 5), sleepAndReturn(20, 20), ], })
            .await()
            .map(it => sleepAndReturn(it, it))
            .await()
            .takeUntil(it => it === 10)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ 5, ]);
    });

    test('parallel with max execution limit', async() => {
        const results = await provider({ flatten: [
            () => sleepAndReturn(0, 0),
            () => sleepAndReturn(100, 100),
            () => sleepAndReturn(25, 25),
            () => sleepAndReturn(75, 75),
            () => sleepAndReturn(25, 25),
            () => sleepAndReturn(150, 150),
        ], })
            .parallel(3)
            .map(it => it())
            .await()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        /* (10 -> 55) => [0]=10 (at 10ms) => [5] = 55 (at 65ms)
              (30 -> 15) => [1]=30 (at 30ms) => [2]=15 (at 45ms)
              (50 -> 0) => [3]=50 (at 50ms) => [4] = 0; (at 50ms)
        * */
        expect(results).toEqual([ 0, 25, 25, 75, 100, 150, ]);

    });
});
