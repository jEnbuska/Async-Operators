import { parallel, } from '../../';

describe('edge cases', () => {

    test('resolve without params', async () => {
        const result = await parallel(5)
            .map(it => it)
            .resolve();
        expect(result).toBe(undefined);
    });

});
