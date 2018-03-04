import { provider, } from '../../';
import { sleep, sleepAndReturn, } from '../common';

describe('concurrency operators ', () => {

    test('error without catch should cause execution to stop upstream', async() => {
        let err;
        const results = [];
        try {
            await provider({ flatten: [ 1, 2, 3, 4, ], })
                .forEach(int => results.push(int))
                .forEach(int => {
                    if (int===2) {
                        throw  new Error('');
                    }
                })
            .pull();
        } catch (e) {
            err = e;
        }
        await sleep(10);
        expect(!!err).toBeTruthy();
        expect(results).toEqual([ 1, 2, ]);
    });

    test('error without catch should cause execution to stop downStream', async() => {
        let err;
        const results = [];
        try {
            await provider({ flatten: [ 1, 2, 3, 4, ], })
                .map(it => sleepAndReturn(it*10, it))
                .await()
                .forEach(int => {
                    if (int===2) {
                        throw  new Error('');
                    }
                })
                .map(it => sleepAndReturn(1, it))
                .await()
                .forEach(int => results.push(int))
                .pull();
        } catch (e) {
            err = e;
        }
        await sleep(50);
        expect(!!err).toBeTruthy();
        expect(results).toEqual([ 1, ]);
    });

    test('catch should prevent up stream to be cancelled', async() => {
        let err;
        const results = [];
        await provider({ flatten: [ 1, 2, 3, 4, ], })
                .map(it => sleepAndReturn(it*10, it))
                .await()
                .forEach(int => {
                    if (int===2) {
                        throw  new Error('');
                    }
                })
                .map(it => sleepAndReturn(1, it))
                .await()
                .forEach(int => results.push(int))
                .catch((e, { index, name, value, }) => {
                    err = e;
                    expect(index).toBe(3);
                    expect(name).toBe('forEach');
                    expect(value).toBe(2);
                })
                .pull();
        await sleep(50);
        expect(!!err).toBeTruthy();
        expect(results).toEqual([ 1, 3, 4, ]);
    });

    test('catch should prevent down stream to be cancelled', async() => {
        let err;
        const results = [];
        await provider({ flatten: [ 1, 2, 3, 4, ], })
                .map(it => sleepAndReturn(it*10, it))
                .await()
                .forEach(int => {
                    if (int===2) {
                        throw  new Error('');
                    }
                })
                .map(it => sleepAndReturn(1, it))
                .await()
                .forEach(int => results.push(int))
                .catch((e, { index, name, value, }) => {
                    err = e;
                    expect(index).toBe(3);
                    expect(name).toBe('forEach');
                    expect(value).toBe(2);
                })
                .pull();

        await sleep(50);
        expect(!!err).toBeTruthy();
        expect(results).toEqual([ 1, 3, 4, ]);
    });
});
