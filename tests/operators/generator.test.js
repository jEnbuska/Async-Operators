import { parallel, generator, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator generator', () => {

    test('generator as middleware', async() => {
        const result = await parallel()
            .toArray()
            .generator(async (onNext, onComplete, finished, value) => {
                const out = value.reduce((sum, it) => sum+it, 0);
                onNext(await sleepAndReturn(20, out));
                onComplete();
            })
            .resolve(3, 1, 2);
        expect(result).toEqual(6);
    });

    test('simple resolve from generator', async() => {
        const result = await generator(
            async (onNext, onComplete) => {
                onNext(await sleepAndReturn(20, 20));
                onNext(await sleepAndReturn(30, 30));
                onComplete();
            })
            .toArray()
            .resolve();
        expect(result).toEqual([ 20, 30, ]);
    });

    test('generator misc', async() => {
        const result = await generator(async (onNext, onComplete) => {
            onNext(await sleepAndReturn(20, 20));
            onNext(await sleepAndReturn(30, 30));
            onComplete();
        })
            .await()
            .toArray()
            .peek(it => expect(it).toEqual([ 20, 30, ]))
            .generator((onNext, onComplete, finished, value) => {
                Promise.all([ sleepAndReturn(10, [ ...value, 10, ]).then(onNext), sleepAndReturn(20, [ 20, ...value, ]).then(onNext), ]).then(onComplete);
            })
            .toArray()
            .resolve();
        expect(result).toEqual([ [ 20, 30, 10, ], [ 20, 20, 30, ], ]);
    });

    test('generator before takeUntil', async() => {
        const tries = [];
        const passes = [];
        await generator(async (onNext, onComplete) => {
            await sleepAndReturn(20, 20).then(onNext);
            await sleepAndReturn(10, 10).then(onNext);
            await sleepAndReturn(0, 0).then(onNext);
            const promises = [ 30, 40, ].map(int => sleepAndReturn(int, int).then(onNext));
            await Promise.all(promises).then(onComplete);
        })
            .peek(it => tries.push(it))
            .takeWhile(it => it !== 0)
            .peek(it => passes.push(it))
            .consume();
        expect(tries).toEqual([ 20, 10, 0, ]);
        expect(passes).toEqual([ 20, 10, ]);
    });

    test('use same generator producer multiple times', async() => {
        const result = await parallel()
            .generator(async (onNext, onComplete, finished, value) => {
                for (let i = 0; i<value; i++) {
                    onNext(i);
                }
                onComplete();
            })
            .toArray()
            .resolve(1, 2, 3, 4);
        expect(result).toEqual([
            0,
            0, 1,
            0, 1, 2,
            0, 1, 2, 3,
        ]);
    });

    test('generator as producer and flattener', async() => {
        const results = [];
        await generator(async (onNext, onComplete) => {
            await onNext(await sleepAndReturn(1, 1));
            onComplete();
        })
            .map(async (one) =>  [ one, 0, await sleepAndReturn(20, 20), ])
            .await()
            .generator(async (next, done, active, arr) => {
                const ten = await sleepAndReturn(10, 10);
                const promises = [ ...arr, ten, ].map(it => sleepAndReturn(it, it).then(next));
                await Promise.all(promises);
                await sleepAndReturn(10, 10);
                done();
            })
            .peek(it => {
                results.push(it);
            })
            .consume();
        expect(results).toEqual([ 1, 0, 10, 20, ]);
    });

    test('generator middleware using isFinished', async() => {
        const tries = [];
        const passes = [];
        await parallel()
            .generator(async (onNext, onComplete, finished, value) => {
                for (let i = 0; i<value.length && !finished(); i++) {
                    onNext(await sleepAndReturn(value, value[i]));
                }
                onComplete();
            })
            .peek(int => tries.push(int))
            .takeWhile(it => it !== 0)
            .peek(int => passes.push(int))
            .toArray()
            .resolve([ 3, 2, 1, 0, -1, ]);
        expect(passes).toEqual([ 3, 2, 1, ]);
        expect(tries).toEqual([ 3, 2, 1, 0, ]);
    });
});
