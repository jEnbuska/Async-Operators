import { parallel, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator take', () => {

    test('take sync', async() => {
        const result = await parallel()
            .take(2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve(3, 1, 2);
        expect(result).toEqual([ 3, 1, ]);
    });

    test('take async', async() => {
        const result = await parallel()
            .await()
            .take(2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .resolve(sleepAndReturn(30, 30), sleepAndReturn(10, 10), sleepAndReturn(20, 20));
        expect(result).toEqual([ 10, 20, ]);
    });

});
