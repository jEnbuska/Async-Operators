import { generator, } from '../../';
import { sleepAndReturn, } from '../common';

describe.only('delay operator', () => {

    test('delay with takeUntil', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await generator(async function*() {
            yield 'delay_1';
            yield await sleepAndReturn(100, 'delay_2');
            yield await sleepAndReturn(100, 'delay_3');
            expect(true).toBeFalsy();// should never reach this
        })
            .delay(10)
            .peek(delayName => intermediate.push(delayName))
            .takeUntil(it => it==='delay_2')
            .toArray()
            .resolve();
        expect(intermediate).toEqual([ 'delay_1', 'delay_2', ]);
        expect(results).toEqual([ 'delay_1', ]);
        expect((Date.now() - before)<150).toBe(true);
    });

});
