import { provider, } from '../../';

describe('latest operators ', () => {

    test('latest should cancel execution of previous passed values', async() => {
        const results = await provider.fromIterable([ { name: 'John', age: 20, }, { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ])
            .latest()
            .delay(10)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ { name: 'John', age: 25, }, ]);
    });

    test('sync latest should not be able to cancel execution of previous passed values', async() => {
        const results = await provider.fromIterable([ { name: 'John', age: 20, }, { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ])
            .latest()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ { name: 'John', age: 20, }, { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ]);
    });

    test('latest should not be able to cancel reduced executions of previous passed values', async() => {
        const results = await provider.fromIterable([ { name: 'John', age: 20, }, { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ])
            .latest()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .delay(10)
            .flatten()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ { name: 'John', age: 20, }, { name: 'Lisa', age: 25, }, { name: 'John', age: 25, }, ]);
    });
});
