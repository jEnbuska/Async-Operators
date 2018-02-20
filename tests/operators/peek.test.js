import { parallel, } from '../../';

describe('operator peek', () => {

    test('peek without params should console.log', async() => {
        const results = [];
        const log = console.log;
        console.log = (val) => results.push(val);
        await parallel()
            .peek()
            .resolve(3, 1, 2);
        console.log = log;
        expect(results).toEqual([ 3, 1, 2, ]);
    });

    test('peek return valus should not effect the outcome', async() => {
        const log = console.log;
        const result = await parallel()
            .peek(() => 'x')
            .toArray()
            .resolve(3, 1, 2);
        console.log = log;
        expect(result).toEqual([ 3, 1, 2, ]);
    });
});
