import { provider, } from '../../';

describe('operator repeat', () => {
    test('repeatWhile sync without limit', async () => {
        let count = 0;
        const preResults = [];
        const results = [];
        await provider({ range: { to: 3, }, })
            .forEach(val => preResults.push(val))
            .repeatWhile(() => count++ <2)
            .forEach(val => results.push(val))
            .pull();
        expect(preResults).toEqual([ 0, 1, 2, ]);
        expect(results).toEqual([ 0, 1, 2, 0, 1, 2, 0, 1, 2, ]);
    }, 30);

    test('repeatWhile with limit', async () => {
        let count = 0;
        const results = [];
        await provider({ range: { to: 3, }, })
            .repeatWhile(() => count++ <5, 2)
            .forEach(val => results.push(val))
            .pull();
        expect(results).toEqual([ 0, 1, 2, 0, 1, 2, 0, 1, 2, ]);
    }, 30);

    test('repeatUntil sync without limit', async () => {
        let count = 0;
        const preResults = [];
        const results = [];
        await provider({ range: { to: 3, }, })
            .forEach(val => preResults.push(val))
            .repeatUntil(() => count++ >=2)
            .forEach(val => results.push(val))
            .pull();
        expect(preResults).toEqual([ 0, 1, 2, ]);
        expect(results).toEqual([ 0, 1, 2, 0, 1, 2, 0, 1, 2, ]);
    }, 30);

    test('repeatUntil with limit', async () => {
        let count = 0;
        const results = [];
        await provider({ range: { to: 3, }, })
            .repeatUntil(() => count++ >=5, 2)
            .forEach(val => results.push(val))
            .pull();
        expect(results).toEqual([ 0, 1, 2, 0, 1, 2, 0, 1, 2, ]);
    }, 30);
});
