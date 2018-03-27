import { provider, } from '../../index';

describe('last operators ', () => {
    test('single last', async() => {
        const results = await provider.fromIterable([ { name: 'John', age: 20, }, { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ])
            .last()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ { name: 'John', age: 25, }, ]);
    });

    test('2 last', async() => {
        const results = await provider.fromIterable([ { name: 'John', age: 20, }, { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ])
            .last(2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ]);
    });

    test('last with bigger max than number or values', async() => {
        const results = await provider.fromIterable([ { name: 'John', age: 20, }, { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ])
            .last(10)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ { name: 'John', age: 20, }, { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ]);
    });
});