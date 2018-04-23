import { provider, } from '../../';

test('fap', async() => {
    const results = await provider.fromIterable([ { val: 0, }, { val: 2, }, { val: undefined, }, { val: null, }, { val: 'test', }, { val: NaN, }, ])
        .fap(next => next.val)
        .reduce((acc, int) => [ ...acc, int, ], [])
        .pull();
    expect(results).toEqual([ 2, 'test', ]);
});
