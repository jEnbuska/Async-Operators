import { parallel, generator, } from '../../';
import { sleep, } from '../common';

describe('operator generator', () => {

    test('generator as middleware', async() => {
        const producer = (arr) => sleep(20, arr.reduce((sum, it) => sum+it, 0));
        const result = await parallel()
            .toArray()
            .generator(async (next, complete, val) => {
                await next(producer(val));
                complete();
            })
            .resolve(3, 1, 2);
        expect(result).toEqual(6);
    });

    test('resolve from generator', async() => {
        const producer = async (next) => {
            await sleep(20);
            next(20);
            await sleep(30);
            next(30);
        };
        const result = await generator(
            async (next, complete) => {
                await producer(next);
                complete();
            })
            .toArray()
            .resolve();
        expect(result).toEqual([ 20, 30, ]);
    });

    test('generator re-extended', async() => {
        const result = await generator(async (next, done) => {
            await sleep(20);
            next(20);
            await sleep(30);
            next(30);
            done();
        })
            .await()
            .toArray()
            .peek(it => expect(it).toEqual([ 20, 30, ]))
            .generator((next, done, val) => {
                Promise.all([ sleep(10, [ ...val, 10, ]).then(next), sleep(20, [ 20, ...val, ]).then(next), ]).then(done);
            })
            .toArray()
            .resolve();
        expect(result).toEqual([ [ 20, 30, 10, ], [ 20, 20, 30, ], ]);
    });

    test('generator takeUntil', async() => {
        const tries = [];
        const passes = [];
        await generator(async (next, done) => {
            await sleep(20, 20).then(next);
            await sleep(10, 10).then(next);
            await sleep(0, 0).then(next);
            await Promise.all([ sleep(30, 30).then(next), sleep(40, 40).then(next), sleep(6000, 6000).then(next), ]).then(done);
        })
            .peek(it => tries.push(it))
            .takeWhile(it => it !== 0)
            .peek(it => passes.push(it))
            .consume();
        expect(tries).toEqual([ 20, 10, 0, ]);
        expect(passes).toEqual([ 20, 10, ]);
    });

    test('generator use multiple times', async() => {
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

    test('generator misc 2', async() => {
        const results = [];
        await generator(async (next, complete) => {
            await next(await sleep(1, 1));
            complete();
        })
            .map(async (one) =>  [ one, 0, await sleep(20, 20), ])
            .await()
            .peek(it => console.log(it))
            .generator(async (next, done, arr) => {
                console.log(Date.now());
                const ten = await sleep(10, 10);
                console.log('here');
                const promises = [ ...arr, ten, ].map(it => sleep(it, it).then(next));
                await Promise.all(promises).then(it => console.log(it));
                await sleep(10, 10);
                console.log(Date.now());
                done();
            })
            .peek(it => {
                results.push(it);
            })
            .consume();
        console.log(Date.now());
        expect(results).toEqual([ 1, 0, 10, 20, ]);
    });
});
