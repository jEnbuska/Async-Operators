import { provider, } from '../../';

describe('last operators ', () => {
    test('lastBy with 1 parameter', async() => {
        const results = await provider({ flatten: [ { name: 'John', age: 20, }, { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ], })
            .lastBy([ 'name', ])
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ]);
    });

    test('lastBy with 2 parameters', async() => {
        const results = await provider({ flatten: [ { name: 'John', age: 20, address: 1, }, { name: 'Lisa', age: 25, address: 0, }, { name: 'John', age: 20, address: 2, }, ], })
            .lastBy([ 'name', 'age', ])
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ { name: 'Lisa', age: 25, address: 0, }, { name: 'John', age: 20, address: 2, }, ]);
    });
});
