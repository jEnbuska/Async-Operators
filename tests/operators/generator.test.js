import { provider, } from '../../';
import { sleepAndReturn, sleep, } from '../common';

describe('operator generator', () => {

    test('generator as middleware', async() => {
        const result = await provider({ flatten: [ 3, 1, 2, ], })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .generator(async function*(val) {
                const out = val.reduce((sum, it) => sum+it, 0);
                yield await sleepAndReturn(20, out);
            })
            .pull();
        expect(result).toEqual(6);
    });

    test('simple resolve from generator', async() => {
        const result = await provider({
            async * generator () {
                yield await sleepAndReturn(20, 20);
                yield await sleepAndReturn(30, 30);
            }, })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ 20, 30, ]);
    });

    test('generator misc', async() => {
        const result = await provider({
            async * generator () {
                yield await sleepAndReturn(20, 20);
                yield await sleepAndReturn(30, 30);
            },
        })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .forEach(it => expect(it).toEqual([ 20, 30, ]))
            .generator(async function*(val) {
                yield await sleepAndReturn(10, [ ...val, 10, ]);
                yield await sleepAndReturn(20, [ 20, ...val, ]);
            })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result).toEqual([ [ 20, 30, 10, ], [ 20, 20, 30, ], ]);
    });

    test('generator before takeUntil', async() => {
        const tries = [];
        const passes = [];
        await provider({
            async *generator () {
                yield await sleepAndReturn(20, 20);
                yield await sleepAndReturn(10, 10);
                yield await sleepAndReturn(0, 0);
                yield await sleepAndReturn(30, 30);
                yield await sleepAndReturn(40, 40);
            },
        })
            .forEach(it => tries.push(it))
            .takeWhile(it => it !== 0)
            .forEach(it => passes.push(it))
            .pull();
        expect(tries).toEqual([ 20, 10, 0, ]);
        expect(passes).toEqual([ 20, 10, ]);
    });

    test('use same generator producer multiple times', async() => {
        const result = await provider({ flatten: [ 1, 2, 3, 4, ], })
            .generator(async function*(value) {
                for (let i = 0; i<value; i++)
                    yield i;
            })
            .ordered()
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        await sleep(50);
        expect(result).toEqual([
            0,
            0, 1,
            0, 1, 2,
            0, 1, 2, 3,
        ]);
    });

    test('generator as producer and flattener', async() => {
        const results = [];
        await provider({
            async * generator () {
                yield 10;
            }, })
            .map(async (ten) =>  [ ten, 0, await sleepAndReturn(20, 20), ])
            .await()
            .generator(async function*(value) {
                for (let i = 0; i<value.length; i++) {
                    yield sleepAndReturn(value[i], value[i]);
                }
            })
            .await()
            .forEach(it => results.push(it))
            .pull();
        expect(results).toEqual([ 0, 10,  20, ]);
    });

    test('generator race should resolve before sleep', async() => {
        const results = [];
        const before = Date.now();
        await provider({
            async * generator () {
                yield 1;
                yield 2;
                yield await sleepAndReturn(1000, 3);
            },
        })
        .takeUntil(it => it===2)
        .forEach(it => results.push(it))
        .pull();
        expect((Date.now() - before)<500).toBe(true);
        expect(results).toEqual([ 1, ]);
    });

    test('generator with parallel', async() => {
        const executionOrder = [];
        const result = await provider({
            * generator () {
                for (let i = 0; i<7; i++) {
                    yield i;
                }
            },
        })
            .parallel(3)
            .forEach(before => executionOrder.push({ before, }))
            .map((it) => sleepAndReturn(it+5, it))
            .await()
            .forEach(after => executionOrder.push({ after, }))
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();

        expect(result).toEqual([ 0, 1, 2, 3, 4, 5, 6, ]);
        expect(executionOrder).toEqual([
            { before: 0, },
            { before: 1, },
            { before: 2, },

            { after: 0, },
            { before: 3, },
            { after: 1, },
            { before: 4, },
            { after: 2, },
            { before: 5, },

            { after: 3, },
            { before: 6, },
            { after: 4, },
            { after: 5, },
            { after: 6, },
        ]);
    });

    test('double parallel with generators', async() => {
        let maxUp = 0;
        let maxDown = 0;
        let invalidParallelCountUp = false;
        let invalidParallelCountDown = false;
        const result = await provider({
            async * generator () {
                yield [ 0, 1, 2, ];
                yield [ 3, 4, 5, ];
                yield [ 6, 7, 8, ];
            },
        })
            .parallel(2)
            .forEach((arr) => {
                maxUp+=arr.length;
                if (maxUp>6) {
                    invalidParallelCountUp = true;
                }
            })
            .generator(async function*(arr) {
                await sleep(1+arr[0]*5);
                for (let i = 0; i<arr.length; i++) {
                    yield arr[i];
                }
            })
            .parallel(2)
            .forEach(() => {
                maxDown++;
                if (maxDown>2) invalidParallelCountDown = true;
            })
            .forEach(() => {
                maxUp--;
                maxDown--;
            })
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        const sortedResult =await provider({ flatten: result, }).sort().reduce((acc, next) => [ ...acc, next, ], []).pull();
        expect(sortedResult ).toEqual([ 0, 1, 2, 3, 4, 5, 6, 7, 8, ]);
        expect(invalidParallelCountDown).toBeFalsy();
        expect(invalidParallelCountUp).toBeFalsy();
    });
});
