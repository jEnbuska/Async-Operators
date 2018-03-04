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

    test('max parallel execution limit', async() => {
        let executing = 0;
        let max = 0;
        const results = await provider({ flatten: [
            () => sleepAndReturn(0, 0),
            () => sleepAndReturn(100, 100),
            () => sleepAndReturn(25, 25),
            () => sleepAndReturn(75, 75),
            () => sleepAndReturn(25, 25),
            () => sleepAndReturn(150, 150),
        ], })
            .parallel(3)
            .forEach(() => {
                executing++;
                if (executing>max) {
                    max=executing;
                }
            })
            .map(it => it())
            .await()
            .forEach(() => executing--)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(max).toBe(3);
        expect(results).toEqual([ 0, 25, 25, 75, 100, 150, ]);
    });
});
