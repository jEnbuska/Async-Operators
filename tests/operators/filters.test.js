import { provider, } from '../../';

describe('filter operators', () => {

    test('filter', async () => {
        const result = await provider.fromIterable([ 1, 2, 3, 2, 1, ])
            .await()
            .filter(it => it!==2)
            .reduce((acc, int) => [ ...acc, int, ], [])
            .pull();
        expect(result).toEqual([ 1, 3, 1, ]);
    });

    test('reject', async () => {
        const results = await provider.fromIterable([ 1, 2, 3, 2, 1, ])
            .reject(it => it!==2)
            .reduce((acc, int) => [ ...acc, int, ], [])
            .pull();
        expect(results).toEqual([ 2, 2, ]);
    });

    test('where', async () => {
        const results = await provider.fromIterable([ { name: 'John', age: 20, }, { name: 'John', age: 25, }, { name: 'Lisa', age: 20, }, { name: 'John', age: 20, }, ])
            .where({ name: 'John', age: 20, })
            .reduce((acc, person) => [ ...acc, person, ], [])
            .pull();
        expect(results).toEqual([ { name: 'John', age: 20, }, { name: 'John', age: 20, }, ]);
    });

    test('distinct', async () => {
        const results = await provider.fromIterable([ 1, 5, 2, 6, 8, 3, 1, 4, 3, 2, 4, 2, ], )
            .distinct()
            .reduce((acc, person) => [ ...acc, person, ], [])
            .pull();
        expect(results).toEqual([ 1, 5, 2, 6, 8, 3, 4, ]);
    });

    test('distinctBy', async () => {
        const results = await provider.fromIterable([
            { name: 'John', age: 20, gender: 'male', },
                { name: 'John', age: 25, gender: 'male', },
                { name: 'Lisa', age: 20, gender: 'female', },
                { name: 'John', age: 20, gender: 'female', },
        ])
            .distinctBy([ 'name', 'gender', ])
            .reduce((acc, person) => [ ...acc, person, ], [])
            .pull();
        expect(results).toEqual([
            { name: 'John', age: 20, gender: 'male', },
            { name: 'Lisa', age: 20, gender: 'female', },
            { name: 'John', age: 20, gender: 'female', }, ]);
    });

    test('skip', async () => {
        const results = await provider.fromIterable([
                { name: 'John', age: 20, gender: 'male', },
                { name: 'John', age: 25, gender: 'male', },
                { name: 'Lisa', age: 20, gender: 'female', },
                { name: 'John', age: 20, gender: 'female', },
        ])
            .skip(2)
            .reduce((acc, person) => [ ...acc, person, ], [])
            .pull();
        expect(results).toEqual([
            { name: 'Lisa', age: 20, gender: 'female', },
            { name: 'John', age: 20, gender: 'female', }, ]);
    });

    test('skipWhile', async () => {
        const results = await provider.fromIterable([
                { name: 'John', age: 20, gender: 'male', },
                { name: 'John', age: 25, gender: 'male', },
                { name: 'Lisa', age: 20, gender: 'female', },
                { name: 'John', age: 20, gender: 'female', },
        ])
            .skipWhile(person => person.name==='John')
            .reduce((acc, person) => [ ...acc, person, ], [])
            .pull();
        expect(results).toEqual([
            { name: 'Lisa', age: 20, gender: 'female', },
            { name: 'John', age: 20, gender: 'female', }, ]);
    });

});
