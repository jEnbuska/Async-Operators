import { generator, } from '../../';
import { sleepAndReturn, sleep, } from '../common';

describe('race', () => {

    test('generator should stop emitting values after cancelled', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await generator(async function*() {
            yield 1;
            yield await sleepAndReturn(100, 2);
            await sleep(10);
            expect(true).toBeFalsy();// should never reach this
            yield await sleepAndReturn(100, 3);
        })
            .peek(int => intermediate.push(int))
            .takeUntil(it => it===2)
            .toArray()
            .resolve();
        expect(intermediate).toEqual([ 1, 2, ]);
        expect(results).toEqual([ 1, ]);
        expect((Date.now() - before)<150).toBe(true);
    });

    test('await should stop resolving values after cancelled', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await generator(async function*() {
            yield 10;
            yield 20;
            yield 30;
        })
            .map(int => sleepAndReturn(int, int))
            .await()
            .peek(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .toArray()
            .resolve();
        expect(intermediate).toEqual([ 10, 20, ]);
        expect(results).toEqual([ 10, ]);
        expect((Date.now() - before)<35).toBe(true);
    });

    test('ordered  should stop resolving values after cancelled', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await generator(async function*() {
            yield 10;
            yield 20;
            yield 30;
        })
            .map(int => sleepAndReturn(int, int))
            .ordered()
            .await()
            .peek(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .toArray()
            .resolve();
        expect(intermediate).toEqual([ 10, 20, ]);
        expect(results).toEqual([ 10, ]);
        expect((Date.now() - before)<35).toBe(true);
    });

    test('ordered should stop resolving values after cancelled', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await generator(async function*() {
            yield 10;
            yield 20;
            yield 30;
        })
            .map(int => sleepAndReturn(int, int))
            .sort()
            .await()
            .peek(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .toArray()
            .resolve();
        expect(intermediate).toEqual([ 10, 20, ]);
        expect(results).toEqual([ 10, ]);
        expect((Date.now() - before)<35).toBe(true);
    });

    test('reverse should stop resolving values after cancelled', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await generator(async function*() {
            yield 10;
            yield 20;
            yield 30;
        })
            .map(int => sleepAndReturn(int, int))
            .reverse()
            .await()
            .peek(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .toArray()
            .resolve();
        expect(intermediate).toEqual([ 10, 20, ]);
        expect(results).toEqual([ 10, ]);
        expect((Date.now() - before)<35).toBe(true);
    });

    test('delay should stop resolving values after cancelled', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await generator(async function*() {
            yield 10;
            yield 20;
            yield 30;
        })
            .map(int => sleepAndReturn(int, int))
            .delay(10)
            .await()
            .peek(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .toArray()
            .resolve();
        expect(intermediate).toEqual([ 10, 20, ]);
        expect(results).toEqual([ 10, ]);
        expect((Date.now() - before)<35).toBe(true);
    });
    test('parallel should stop resolving values after cancelled', async() => {
        const intermediate = [];
        const before = Date.now();
        const results = await generator(async function*() {
            yield 10;
            yield 20;
            yield 30;
        })
            .map(int => sleepAndReturn(int, int))
            .parallel()
            .await()
            .peek(int => intermediate.push(int))
            .takeUntil(it => it===20)
            .toArray()
            .resolve();
        expect(intermediate).toEqual([ 10, 20, ]);
        expect(results).toEqual([ 10, ]);
        expect((Date.now() - before)<35).toBe(true);
    });
});
