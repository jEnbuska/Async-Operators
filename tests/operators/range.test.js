import { parallel, } from '../../';

describe('operator range', () => {

    test('range ACC', async () => {
        const result = await parallel()
            .toArray()
            .range(1, 10);
        expect(result).toEqual([ 1, 2, 3, 4, 5, 6, 7, 8, 9, ]);
    });

    test('range DESC', async () => {
        const result = await parallel()
            .toArray()
            .range(10, 1);
        expect(result).toEqual([ 10, 9, 8, 7, 6, 5, 4, 3, 2, ]);
    });

    test('range 1', async () => {
        const result = await parallel()
            .toArray()
            .range(1, 2);
        expect(result).toEqual([ 1, ]);
    });

    test('range 0', async () => {
        const result = await parallel()
            .toArray()
            .range(1, 1);
        expect(result).toEqual([ ]);
    });

    test('range invalid parameter', async () => {
        expect(() => parallel()
            .toArray()
            .range(undefined, 1)).toThrow();
        expect(() => parallel()
            .toArray()
            .range(1, undefined)).toThrow();

        expect(() => parallel()
            .toArray()
            .range(undefined, 1)).toThrow();
        expect(() => parallel()
            .toArray()
            .range(1, 1.1)).toThrow();
        expect(() => parallel()
            .toArray()
            .range(1, '2')).toThrow();
    });

});
