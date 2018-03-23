import { provider, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator flatten', () => {

    test('every async', async () => {
        const result = await provider({ flatten: [ sleepAndReturn(10, 6), sleepAndReturn(15, 10), ], })
            .await()
            .every(it => it>5)
            .pull();
        expect(result).toBe(true);
    });

    test('every sync', async () => {
        const result = await provider({ flatten: [ 6, 10, 5, ], })
            .every(it => it>5)
            .pull();
        expect(result).toBe(false);
    });

});
