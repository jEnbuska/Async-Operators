import { parallel, } from '../../';

describe('operator toSet', () => {

    test('toObjectSet without picker', async() => {
        const result = await parallel()
            .toObjectSet()
            .resolve(1, 2, 3);
        expect(result).toEqual({ 1: true, 2: true, 3: true, });
    });

    test('toObjectSet with picker', async() => {
        const result = await parallel()
            .toObjectSet(it => it.name)
            .resolve({ name: 'John', }, { name: 'Lisa', });
        expect(result).toEqual({ John: true, Lisa: true, });
    });

    test('toObject with picker', async() => {
        const result = await parallel()
            .toObject(it => it.name)
            .resolve({ name: 'John', }, { name: 'Lisa', });
        const map = new Map();
        map.set('John', { name: 'John', });
        map.set('Lisa', { name: 'Lisa', });
        expect(result).toEqual({ John: { name: 'John', }, Lisa: { name: 'Lisa', }, });
    });

    test('toObject without picker', async() => {
        const result = await parallel()
            .toObject()
            .resolve(1, 2, 3);
        expect(result).toEqual({ 1: 1, 2: 2, 3: 3, });
    });

});
