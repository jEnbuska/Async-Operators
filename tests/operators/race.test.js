import { provider, } from '../../';
import { sleepAndReturn, sleep, createDuration, } from '../common';

describe('race', () => {

    test('generator should stop emitting values after cancelled', async() => {
        const intermediate = [];
        const getDuration = createDuration();
        const results = await provider({
            async * generator () {
                yield 1;
                yield await sleepAndReturn(10, 2);
                await sleep(10);
                expect(true).toBeFalsy();// should never reach this
                yield await sleepAndReturn(100, 3);
            },
        })
            .forEach(int => intermediate.push(int))
            .takeUntil(it => it===2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(getDuration().time<100).toBeTruthy();
        await sleep(20); // ensure line 4 in generator is never reached
        expect(intermediate).toEqual([ 1, 2, ]);
        expect(results).toEqual([ 1, ]);
    });

    test('await should stop resolving values after cancelled', async() => {

        const intermediate = [];
        const before = Date.now();
        const results = await provider({
            async * generator () {
                yield 10;
                yield 20;
                yield 200;
            },
        })
            .map(int => sleepAndReturn(int, int))
            .await()
            .forEach(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect((Date.now() - before)<50).toBe(true);
        expect(intermediate).toEqual([ 10, 20, ]);
        expect(results).toEqual([ 10, ]);
    });

    test('ordered  should stop resolving values after cancelled', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await provider({
            async *generator () {
                yield 10;
                yield 20;
                yield 60;
            },
        })
            .map(int => sleepAndReturn(int, int))
            .ordered()
            .await()
            .forEach(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(intermediate).toEqual([ 10, 20, ]);
        expect(results).toEqual([ 10, ]);
        expect((Date.now() - before)<45).toBe(true);
    });

    test('ordered should stop resolving values after cancelled', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await provider({
            async * generator () {
                yield 10;
                yield 20;
                yield 200;
            },
        })
            .map(int => sleepAndReturn(int, int))
            .await()
            .forEach(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(intermediate).toEqual([ 10, 20, ]);
        expect(results).toEqual([ 10, ]);
        expect((Date.now() - before)<100).toBe(true);
    });

    test('reverse should stop resolving values after cancelled', async() => {
        const intermediate = [];
        const results = await provider({
            async * generator () {
                yield 10;
                yield 20;
                yield 30;
            },
        })
            .map(int => sleepAndReturn(int, int))
            .await()
            .reverse()
            .forEach(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(intermediate).toEqual([ 30, 20, ]);
        expect(results).toEqual([ 30, ]);
    });

    test('delay should stop resolving values after cancelled', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await provider({
            async * generator () {
                yield 10;
                yield 20;
                yield 30;
            },
        })
            .map(int => sleepAndReturn(int, int))
            .delay(10)
            .await()
            .forEach(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect((Date.now() - before)<40).toBe(true);
        expect(intermediate).toEqual([ 10, 20, ]);
        expect(results).toEqual([ 10, ]);
    });
    test('parallel should stop resolving values after cancelled', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await provider({
            async * generator () {
                yield 10;
                yield 20;
                yield 200;
            },
        })
            .map(int => sleepAndReturn(int, int))
            .parallel()
            .await()
            .forEach(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(intermediate).toEqual([ 10, 20, ]);
        expect(results).toEqual([ 10, ]);
        expect((Date.now() - before)<100).toBeTruthy();
    });
});
