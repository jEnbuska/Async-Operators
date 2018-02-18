import { parallel, } from '../../';
import { sleep, } from '../common';

describe('concurrency operators ', () => {

    test('ordered await', async() => {
        const results = await parallel()
            .await()
            .ordered()
            .toArray()
            .resolve(sleep(10, 10), sleep(5, 5));
        expect(results).toEqual([ 10, 5, ]);
    });

    test('parallel await', async() => {
        const results = await parallel()
            .await()
            .toArray()
            .resolve(sleep(10, 10), sleep(5, 5));
        expect(results).toEqual([ 5, 10, ]);
    });

    test('parallel with max execution limit', async() => {
        const results = await parallel(3)
            .map(it => it())
            .await()
            .toArray()
            .resolve(
                () => sleep(0, 0), () => sleep(100, 100), () => sleep(25, 25),
                () => sleep(75, 75), () => sleep(25, 25), () => sleep(150, 150));
        /* (10 -> 55) => [0]=10 (at 10ms) => [5] = 55 (at 65ms)
              (30 -> 15) => [1]=30 (at 30ms) => [2]=15 (at 45ms)
              (50 -> 0) => [3]=50 (at 50ms) => [4] = 0; (at 50ms)
        * */
        expect(results).toEqual([ 0, 25, 25, 75, 100, 150, ]);
    });

    test('ordered', async() => {
        const results = await parallel()
            .await()
            .ordered()
            .toArray()
            .resolve(sleep(10, 10), sleep(5, 5));
        expect(results).toEqual([ 10, 5, ]);
    });
});
