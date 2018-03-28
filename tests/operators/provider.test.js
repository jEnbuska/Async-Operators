import { provider, } from '../../';

describe('provider', () => {

    test('fromPromise', async() => {
        const results = await provider.fromPromise(new Promise(res => setTimeout(res(2), 5)))
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ 2, ]);
    });

    test('fromIterable', async() => {
        const results = await provider.fromIterable([ 1, 2, 3, ])
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ 1, 2, 3, ]);
    });

    test('fromCallback', async() => {
        const results = await provider.fromCallback(function ({ onNext, onComplete, }) {
            onNext(1);
            onNext(2);
            onNext(3);
            onComplete();
        })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ 1, 2, 3, ]);
    });

    test('fromRange', async() => {
        const results = await provider.fromRange({ from: 1, to: 4, })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ 1, 2, 3, ]);
    });

    test('fromGenerator', async() => {
        const results = await provider.fromGenerator(function*() {
            yield 1;
            yield 2;
            yield 3;
        })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(results).toEqual([ 1, 2, 3, ]);
    });
});
