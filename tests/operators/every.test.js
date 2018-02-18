import { parallel, } from '../../';
import { sleep, } from '../common';

describe('operator flatten', () => {

    test('every async', async () => {
        const result = await parallel()
            .await()
            .every(it => it>5)
            .resolve(sleep(10, 6), sleep(15, 10));
        expect(result).toBe(true);
    });

    test('every sync', async () => {
        const result2 = await parallel()
            .every(it => it>5)
            .resolve(6, 10, 5);
        expect(result2).toBe(false);
    });

});
