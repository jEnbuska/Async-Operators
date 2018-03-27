import { provider, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator take', () => {

    test('take sync', async() => {
        const result = await provider.fromIterable([ 3, 1, 2, ])
            .take(2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 3, 1, ]);
    });

    test('take async', async() => {
        const result = await provider.fromIterable([ sleepAndReturn(30, 30), sleepAndReturn(10, 10), sleepAndReturn(20, 20), ])
            .await()
            .take(2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 10, 20, ]);
    });

});
