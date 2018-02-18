import { parallel, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator toSet', () => {

    test('toSet without picker', async() => {
        const result = await parallel()
            .toSet()
            .resolve(1, 2, 3);
        const set = new Set([ 1, 2, 3, ]);
        expect(result).toEqual(set);
    });

    test('toSet with picker', async() => {
        const result = await parallel()
            .toSet(it => it.name)
            .resolve({ name: 'John', }, { name: 'Lisa', });
        const set = new Set([ 'John', 'Lisa', ]);
        expect(result).toEqual(set);
    });

});
