import { provider, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator some', () => {

    test('some with no data should return false', async () => {
        const result = await provider({ flatten: [], })
            .some(() => true)
            .pull();
        expect(result).toBe(false);
    });

    test('some async should return false', async () => {
        const result = await provider({ flatten: [ sleepAndReturn(10, 6), sleepAndReturn(15, 10), ], })
            .await()
            .some(it => it<5)
            .pull();
        expect(result).toBe(false);
    });

    test('some sync should return false', async () => {
        const result = await provider({ flatten: [ 6, 10, ], })
            .some(it => it<5)
            .pull();
        expect(result).toBe(false);
    });

    test('some async should return true', async () => {
        const result = await provider({ flatten: [ sleepAndReturn(10, 6), sleepAndReturn(15, 10), sleepAndReturn(13, 4), sleepAndReturn(11, 3), ], })
            .parallel()
            .await()
            .some(it => it<5)
            .pull();
        expect(result).toBe(true);
    }, 200);

    test('some sync should return true', async () => {
        const result = await provider({ flatten: [ 6, 10, 4, 3, ], })
            .some(it => it<5)
            .pull();
        expect(result).toBe(true);
    });
});
