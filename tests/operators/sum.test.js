import { provider, } from '../../';

describe('operator sum', () => {

    test('sum simple', async () => {
        const result = await provider.fromIterable([ 3, 1, -2, ])
            .sum()
            .pull();
        expect(result).toBe(3+1-2);
    });

    test('multiple sums', async () => {
        const result = await provider.fromIterable([ 3, 1, -2, ])
            .sum()
            .flatten(it => {
                const all = [];
                for (let i = 0; i<=it; i++) {
                    all.push(i);
                }
                return all;
            })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 0, 1, 2, ]);
    });
});
