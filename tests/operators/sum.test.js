import { parallel, } from '../../';

describe('operator sum', () => {

    test('sum simple', async () => {
        const result = await parallel()
            .sum()
            .resolve(3, 1, -2);
        expect(result).toBe(3+1-2);
    });

    test('multiple sums', async () => {
        const result = await parallel()
            .sum()
            .flatten(it => {
                const all = [];
                for (let i = 0; i<=it; i++) {
                    all.push(i);
                }
                return all;
            })
            .toArray()
            .resolve(3, 1, -2);
        expect(result).toEqual([ 0, 1, 2, ]);
    });
});
