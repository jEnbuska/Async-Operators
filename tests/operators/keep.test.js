import { parallel, } from '../../';

describe('operator keep', () => {

    test('keep with callback function', async () => {
        const result = await parallel()
            .keep(({ length, }) => ({ length, }))
            .flatten()
            .filter(person => person.age< 30)
            .map((it, { length, }) => ({ ...it, length, }))
            .toArray()
            .resolve([ { name: 'John', age: 20, }, { name: 'Lisa', age: 30, }, { name: 'John', age: 25, }, ]);
        expect(result).toEqual([
            { name: 'John', age: 20, length: 3, },
            { name: 'John', age: 25, length: 3, },
        ]);
    });

    test('keep with string param', async () => {
        const result = await parallel()
            .keep('length')
            .flatten()
            .filter(person => person.age< 30)
            .map((it, { length, }) => ({ ...it, length, }))
            .toArray()
            .resolve([ { name: 'John', age: 20, }, { name: 'Lisa', age: 30, }, { name: 'John', age: 25, }, ]);
        expect(result).toEqual([
            { name: 'John', age: 20, length: 3, },
            { name: 'John', age: 25, length: 3, }, ]);
    });

});
