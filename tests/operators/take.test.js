import { parallel, } from '../../';
import { sleep, } from '../common';

describe('operator take', () => {

    test('take sync', async() => {
        const result = await parallel()
            .take(2)
            .toArray()
            .resolve(3, 1, 2);
        expect(result).toEqual([ 3, 1, ]);
    });

    test('take async', async() => {
        const result = await parallel()
            .await()
            .take(2)
            .toArray()
            .resolve(sleep(30, 30), sleep(10, 10), sleep(20, 20));
        expect(result).toEqual([ 10, 20, ]);
    });

});
