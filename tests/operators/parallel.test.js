import { parallel, generator, } from '../../';
import { sleepAndReturn, } from '../common';

describe('parallel tests', () => {

    test('parallel as middleware', async() => {
        const executionOrder = [];
        let concurrent = 0;
        let concurrentMax = 0;
        const result = await generator(function*() {
            for (let i = 0; i<7; i++) {
                yield i;
            }
        })
            .peek(unControlled => executionOrder.push({ unControlled, }))
            .parallel(3)
            .peek(() => concurrent++)
            .peek(() => {
                if (concurrent>concurrentMax) {
                    concurrentMax = concurrent;
                }
            })
            .peek(controlled => executionOrder.push({ controlled, }))
            .delay(5)
            .peek(toBeResolved => executionOrder.push({ toBeResolved, }))
            .peek(() => --concurrent)
            .toArray()
            .resolve();
        expect(concurrentMax).toBe(3);
        expect(result).toEqual([ 0, 1, 2, 3, 4, 5, 6, ]);
    });

    test('parallel as source', async() => {
        const executionOrder = [];
        const result = await parallel(3)
            .peek(it => console.log(it))
            .peek(before => executionOrder.push({ before, }))
            .peek(it => console.log(it))
            .delay(int => int*2+5)
            .peek(it => console.log(it))
            .peek(after => executionOrder.push({ after, }))
            .peek(it => console.log(it))
            .toArray()
            .resolve(0, 1, 2, 3, 4, 5, 6);
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

    test('multiple parallels should not cause stack overflow', async() => {
        const tasks = [];
        let current;
        for (let i = 0; i<1000; i++) {
            if (!i%3) {
                current = [];
                tasks.push(current);
            }
            current.push(i);
        }
        const before = Date.now();
        const result = await parallel(2)
            .flatten()
            .parallel(2)
            .toArray()
            .flatten()
            .parallel(2)
            .map(it => it*2)
            .toArray()
            .resolve(...tasks);
        console.log(Date.now()-before);
        expect(result.length).toBe(1000);
    });

    test('double parallel with flatten', async() => {
        let upper = 0;
        let lower = 0;
        let lowerMax = 0;
        let upperMax = 0;
        const result = await parallel(2)
            .peek(() => {
                upper+=3;
            })
            .peek(() => {
                if (upperMax<upper) {
                    upperMax=upper;
                }
            })
            .flatten()
            .delay(5)
            .peek(() => upper--)
            .parallel(2)
            .peek(() => lower++)
            .peek(() => {
                if (lowerMax<lower) lowerMax = lower;
            })
            .delay(5)
            .peek(() => lower--)
            .toArray()
            .resolve([ 0, 1, 2, ], [ 3, 4, 5, ], [ 6, 7, 8, ]);
        expect(result.sort()).toEqual([ 0, 1, 2, 3, 4, 5, 6, 7, 8, ]);
        expect(lowerMax).toBe(2);
        expect(upperMax).toBe(6);
    });

});
