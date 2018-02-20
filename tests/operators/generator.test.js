import { parallel, generator, } from '../../';
import { sleepAndReturn, } from '../common';

describe('operator generator', () => {

    test('generator as middleware', async() => {
        const result = await parallel()
            .toArray()
            .generator(async function*(val) {
                const out = val.reduce((sum, it) => sum+it, 0);
                yield await sleepAndReturn(20, out);
            })
            .resolve(3, 1, 2);
        expect(result).toEqual(6);
    });

    test('simple resolve from generator', async() => {
        const result = await generator(
            async function* () {
                yield await sleepAndReturn(20, 20);
                yield await sleepAndReturn(30, 30);
            })
            .toArray()
            .resolve();
        expect(result).toEqual([ 20, 30, ]);
    });

    test('generator misc', async() => {
        const result = await generator(async function*() {
            yield await sleepAndReturn(20, 20);
            yield await sleepAndReturn(30, 30);
        })
            .toArray()
            .peek(it => expect(it).toEqual([ 20, 30, ]))
            .generator(async function*(val) {
                yield await sleepAndReturn(10, [ ...val, 10, ]);
                yield await sleepAndReturn(20, [ 20, ...val, ]);
            })
            .toArray()
            .resolve();
        expect(result).toEqual([ [ 20, 30, 10, ], [ 20, 20, 30, ], ]);
    });

    test('generator before takeUntil', async() => {
        const tries = [];
        const passes = [];
        await generator(async function* () {
            yield await sleepAndReturn(20, 20);
            yield await sleepAndReturn(10, 10);
            yield await sleepAndReturn(0, 0);
            yield await sleepAndReturn(30, 30);
            yield await sleepAndReturn(40, 40);
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
            .generator(async function*(value) {
                for (let i = 0; i<value; i++)
                    yield i;
            })
            .ordered()
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
        await generator(async function*() {
            yield 10;
        })
            .map(async (ten) =>  [ ten, 0, await sleepAndReturn(20, 20), ])
            .await()
            .generator(async function*(value) {
                for (let i = 0; i<value.length; i++) {
                    yield sleepAndReturn(value[i], value[i]);
                }
            })
            .await()
            .peek(it => results.push(it))
            .consume();
        expect(results).toEqual([ 0, 10,  20, ]);
    });

    test('generator race should resolve before sleep', async() => {
        const results = [];
        const before = Date.now();
        await generator(async function*() {
            yield 1;
            yield 2;
            yield await sleepAndReturn(1000, 3);
        })
        .peek(it => console.log(it))
        .takeUntil(it => {
            console.log(it);
            return it===2
        })
        .peek(it => results.push(it))
        .consume();
        expect((Date.now() - before)<500).toBe(true);
        expect(results).toEqual([ 1, ]);
    });

});
