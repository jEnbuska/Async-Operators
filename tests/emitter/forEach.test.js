import { emitter, } from '../../';
import { sleepAndReturn, } from '../common';

describe('emitter forEach', () => {
    test('forEach sync', async () => {
        const values = [];
        const eventListener = await emitter()
            .forEach(it => values.push(it))
            .listen();

        await Promise.all([ 0, 1, 2, 3, 4, ].map(eventListener.emit));
        expect(values).toEqual([ 0, 1, 2, 3, 4, ]);
    });
    test('forEach async', async () => {
        const values = [];
        const eventListener = await emitter()
            .map(sleepAndReturn)
            .await()
            .forEach(it => values.push(it))
            .listen();
        await Promise.all([ 0, 1, 2, 3, 4, ].map(eventListener.emit));
        expect(values).toEqual([ 0, 1, 2, 3, 4, ]);
    });
});
