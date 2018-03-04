import { provider, } from '../../';
import { sleepAndReturn, } from '../common';

describe('upstream filter operators', () => {

    test('takeWhile', async () => {
        const start = Date.now();
        const result = await provider({ flatten: [ 10, 20, 30, 40, ], })
            .map(sleepAndReturn)
            .await()
            .takeWhile(it => it!==30)
            .reduce((acc, int) => [ ...acc, int, ], [])
            .pull();
        expect(result).toEqual([ 10, 20, ]);
        expect((Date.now() - start) < 70).toBe(true);
    });

    test('every', async () => {
        const start = Date.now();
        const result = await provider({ flatten: [ 10, 20, 30, 40, ], })
            .map(sleepAndReturn)
            .await()
            .every(it => it!==30)
            .pull();
        expect(result).toBe(false);
        expect((Date.now() - start) < 70).toBe(true);
    });

    test('some', async () => {
        const start = Date.now();
        const result = await provider({ flatten: [ 10, 20, 30, 40, ], })
            .map(sleepAndReturn)
            .await()
            .some(it => it===30)
            .pull();
        expect(result).toBe(true);
        expect((Date.now() - start) < 70).toBe(true);
    });

    test('first', async () => {
        const start = Date.now();
        const result = await provider({ flatten: [ 10, 20, 30, 40, ], })
            .map(sleepAndReturn)
            .await()
            .filter(it => it===30)
            .first()
            .pull();
        expect(result).toBe(30);
        expect((Date.now() - start) < 70).toBe(true);
    });
});
