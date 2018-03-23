import { provider, } from '../../';
import { sleepAndReturn, createDuration, } from '../common';

describe('upstream filter operators', () => {

    test('takeWhile', async () => {
        const getDuration = createDuration();
        const result = await provider({ flatten: [ 10, 20, 30, 100, ], })
            .map(sleepAndReturn)
            .await()
            .takeWhile(it => it!==30)
            .reduce((acc, int) => [ ...acc, int, ], [])
            .pull();
        expect(result).toEqual([ 10, 20, ]);
        expect((getDuration().time) < 100).toBe(true);
    });

    test('every', async () => {
        const getDuration = createDuration();
        const result = await provider({ flatten: [ 10, 20, 30, 40, ], })
            .map(sleepAndReturn)
            .await()
            .every(it => it!==30)
            .pull();
        expect(result).toBe(false);
        expect(getDuration().time < 70).toBe(true);
    });

    test('some', async () => {
        const getDurarion = createDuration();
        const result = await provider({ flatten: [ 10, 20, 30, 40, ], })
            .map(sleepAndReturn)
            .await()
            .some(it => it===30)
            .pull();
        expect(result).toBe(true);
        expect(getDurarion().time < 70).toBe(true);
    });

    test('first', async () => {
        const getDuration = createDuration();
        const result = await provider({ flatten: [ 10, 20, 30, 40, ], })
            .map(sleepAndReturn)
            .await()
            .filter(it => it===30)
            .first()
            .pull();
        expect(result).toBe(30);
        expect(getDuration().time < 70).toBe(true);
    });
});
