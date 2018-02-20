import { generator, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator forEach', () => {
    test('forEach sync', async () => {
        const values = [];
        await generator(async function*() {
            for (let i = 0; i<5; i++) {
                yield i;
            }
        }).forEach(it => values.push(it));
        expect(values).toEqual([ 0, 1, 2, 3, 4, ]);
    });
    test('forEach async', async () => {
        const values = [];
        await generator(async function* () {
            for (let i = 0; i < 5; i++) {
                yield await sleepAndReturn(i*10, i);
            }
        })
            .await()
        .forEach(it => values.push(it));
        expect(values).toEqual([ 0, 1, 2, 3, 4, ]);
    });
});
