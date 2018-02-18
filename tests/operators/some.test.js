import { parallel, } from '../../';
import { sleep, } from '../common';

describe('operator some', () => {

    test('some with no data should return false', async () => {
        const result = await parallel()
            .some(() => true)
            .resolve();
        expect(result).toBe(false);
    });

    test('some async should return false', async () => {
        const result = await parallel()
            .await()
            .some(it => it<5)
            .resolve(sleep(10, 6), sleep(15, 10));
        expect(result).toBe(false);
    });

    test('some sync should return false', async () => {
        const result = await parallel()
            .some(it => it<5)
            .resolve(6, 10);
        expect(result).toBe(false);
    });

    test('some async should return true', async () => {
        const result = await parallel()
            .parallel()
            .await()
            .some(it => it<5)
            .resolve(sleep(10, 6), sleep(15, 10), sleep(13, 4), sleep(11, 3));
        expect(result).toBe(true);
    });

    test('some sync should return true', async () => {
        const result = await parallel()
            .some(it => it<5)
            .resolve(6, 10, 4, 3);
        expect(result).toBe(true);
    });
});
