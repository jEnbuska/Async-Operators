import { provider, } from '../../';

describe('latest operators ', () => {
    test('latestBy with 1 parameter', async() => {
        const results = await provider({ flatten: [ { name: 'John', age: 20, }, { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ], })
            .latestBy('name')
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ]);
    });

    test('latestBy with 2 parameters', async() => {
        const results = await provider({ flatten: [ { name: 'John', age: 20, address: 1, }, { name: 'Lisa', age: 25, address: 0, }, { name: 'John', age: 20, address: 2, }, ], })
            .latestBy('name', 'age')
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ { name: 'Lisa', age: 25, address: 0, }, { name: 'John', age: 20, address: 2, }, ]);
    });
});
