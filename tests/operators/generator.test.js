import { parallel, generator, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator generator', () => {

    test('generator as middleware', async() => {
        const producer = (arr) => sleepAndReturn(20, arr.reduce((sum, it) => sum+it, 0));
        const result = await parallel()
            .toArray()
            .generator(async (next, complete, val) => {
                await next(producer(val));
                complete();
            })
            .resolve(3, 1, 2);
        expect(result).toEqual(6);
    });

    test('simple resolve from generator', async() => {
        const result = await generator(
            async (next, complete) => {
                next(await sleepAndReturn(20, 20));
                next(await sleepAndReturn(30, 30))
                complete();
            })
            .toArray()
            .resolve();
        expect(result).toEqual([ 20, 30, ]);
    });

    test('generator misc', async() => {
        const result = await generator(async (next, done) => {
            next(await sleepAndReturn(20, 20));
            next(await sleepAndReturn(30, 30));
            done();
        })
            .await()
            .toArray()
            .peek(it => expect(it).toEqual([ 20, 30, ]))
            .generator((next, done, val) => {
                Promise.all([ sleepAndReturn(10, [ ...val, 10, ]).then(next), sleepAndReturn(20, [ 20, ...val, ]).then(next), ]).then(done);
            })
            .toArray()
            .resolve();
        expect(result).toEqual([ [ 20, 30, 10, ], [ 20, 20, 30, ], ]);
    });

    test('generator before takeUntil', async() => {
        const tries = [];
        const passes = [];
        await generator(async (next, done) => {
            await sleepAndReturn(20, 20).then(next);
            await sleepAndReturn(10, 10).then(next);
            await sleepAndReturn(0, 0).then(next);
            await Promise.all([ sleepAndReturn(30, 30).then(next), sleepAndReturn(40, 40).then(next), sleepAndReturn(6000, 6000).then(next), ]).then(done);
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
            .generator(async (next, done, val) => {
                for (let i = 0; i<val; i++) {
                    next(i);
                }
                done();
            })
            .toArray()
            .resolve(1, 2, 3, 4, 5);
        expect(result).toEqual([ 0, 0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 3, 4, ]);
    });

    test('generator as producer and flattener', async() => {
        const results = [];
        await generator(async (next, complete) => {
            await next(await sleepAndReturn(1, 1));
            complete();
        })
            .map(async (one) =>  [ one, 0, await sleepAndReturn(20, 20), ])
            .await()
            .generator(async (next, done, arr) => {
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
});
