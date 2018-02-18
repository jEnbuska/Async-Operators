import { parallel, } from '../../';

describe('operator toMap', () => {

    test('toMap without picker', async() => {
        const result = await parallel()
            .toMap()
            .resolve(1, 2, 3);
        const map = new Map();
        map.set(1, 1);
        map.set(2, 2);
        map.set(3, 3, );
        expect(result).toEqual(map);
    });

    test('toMap with picker', async() => {
        const result = await parallel()
            .toMap(it => it.name)
            .resolve({ name: 'John', }, { name: 'Lisa', });
        const map = new Map();
        map.set('John', { name: 'John', });
        map.set('Lisa', { name: 'Lisa', });
        expect(result).toEqual(map);
    });

    test('toMap without picker', async() => {
        const result = await parallel()
            .toMap()
            .resolve(1, 2, 3);
        const map = new Map();
        map.set(1, 1);
        map.set(2, 2);
        map.set(3, 3, );
        expect(result).toEqual(map);
    });

});
