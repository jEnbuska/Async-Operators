import { provider, } from '../../';
import { sleepAndReturn, } from '../common';

describe('delay operator', () => {

    test('delay with takeUntil', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await provider({
            async * generator () {
                yield 'delay_1';
                yield await sleepAndReturn(200, 'delay_2');
                yield await sleepAndReturn(200, 'delay_3');
                expect(true).toBeFalsy();// should never reach this
            },
        })
            .delay(10)
            .forEach(delayName => intermediate.push(delayName))
            .takeUntil(it => it==='delay_2')
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(intermediate).toEqual([ 'delay_1', 'delay_2', ]);
        expect(results).toEqual([ 'delay_1', ]);
        expect((Date.now() - before)<400).toBe(true);
    });
});
