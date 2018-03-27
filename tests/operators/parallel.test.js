import { provider, } from '../../';

describe('parallel tests', () => {

    test('parallel as middleware', async() => {
        const executionOrder = [];
        let concurrent = 0;
        let concurrentMax = 0;
        const result = await provider.fromGenerator(
            function * () {
                for (let i = 0; i<7; i++) {
                    yield i;
                }
            })
            .forEach(unControlled => executionOrder.push({ unControlled, }))
            .parallel(3)
            .forEach(() => concurrent++)
            .forEach(() => {
                if (concurrent>concurrentMax) {
                    concurrentMax = concurrent;
                }
            })
            .forEach(controlled => executionOrder.push({ controlled, }))
            .delay(5)
            .forEach(toBeResolved => executionOrder.push({ toBeResolved, }))
            .forEach(() => --concurrent)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(concurrentMax).toBe(3);
        expect(result).toEqual([ 0, 1, 2, 3, 4, 5, 6, ]);
    });

    test('parallel as source', async() => {
        const executionOrder = [];
        const result = await provider.fromIterable([ 0, 1, 2, 3, 4, 5, 6, ])
            .parallel(3)
            .forEach(before => executionOrder.push({ before, }))
            .delay(int => int*2+5)
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
        const result = await provider.fromIterable(tasks)
            .parallel(2)
            .flatten()
            .parallel(2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .flatten()
            .parallel(2)
            .map(it => it*2)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result.length).toBe(1000);
    });

    test('double parallel with flatten', async() => {
        let upper = 0;
        let lower = 0;
        let lowerMax = 0;
        let upperMax = 0;
        const result = await provider.fromIterable([ [ 0, 1, 2, ], [ 3, 4, 5, ], [ 6, 7, 8, ], ])
            .parallel(2)
            .forEach(() => upper+=3)
            .forEach(() => {
                if (upperMax<upper)upperMax=upper;
            })
            .flatten()
            .delay(5)
            .forEach(() => upper--)
            .parallel(2)
            .forEach(() => lower++)
            .forEach(() => {
                if (lowerMax<lower) lowerMax = lower;
            })
            .delay(5)
            .forEach(() => lower--)
            .reduce((acc, next) => [ ...acc, next, ], [])
            .pull();
        expect(result.sort()).toEqual([ 0, 1, 2, 3, 4, 5, 6, 7, 8, ]);
        expect(lowerMax).toBe(2);
        expect(upperMax).toBe(6);
    });

});
