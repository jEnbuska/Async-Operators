import { emitter, } from '../../';
import { sleepAndReturn, } from '../common';

describe('delay emitter', () => {

    test('delay with takeUntil', async() => {
        const intermediate = [];
        const before = Date.now();
        let lastScannedValue;
        const eventEmitter = await emitter()
            .delay(10)
            .await()
            .forEach(delayName => intermediate.push(delayName))
            .takeUntil(it => it==='delay_2')
            .scan((acc, next) => lastScannedValue = [ ...acc, next, ], [])
            .listen();
        await Promise.all([
            eventEmitter.emit('delay_1'),
            eventEmitter.emit(sleepAndReturn(10, 'delay_2')),
            eventEmitter.emit(sleepAndReturn(200, 'delay_3')),
        ]);

        expect(intermediate).toEqual([ 'delay_1', 'delay_2', ]);
        expect(lastScannedValue).toEqual([ 'delay_1', ]);
        expect((Date.now() - before)<100).toBeTruthy();
    });

});
