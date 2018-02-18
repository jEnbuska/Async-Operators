import { generator, } from '../../';
import { sleep, } from '../common';

describe('operator forEach', () => {
    test('forEach sync', async () => {
        const values = [];
        await generator((next, done) => {
            for (let i = 0; i<5; i++) {
                next(i);
            }
            done();
        }).forEach(it => values.push(it));
        expect(values).toEqual([ 0, 1, 2, 3, 4, ]);
    });
    test('forEach async', async () => {
        const values = [];
        await generator(async (next, done) => {
            for (let i = 0; i<5; i++) {
                next(await sleep(i, i));
            }
            done();
        }).forEach(it => values.push(it));
        expect(values).toEqual([ 0, 1, 2, 3, 4, ]);
    });
});
