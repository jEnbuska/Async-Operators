const createRace = require('../src/compositeRace');
const { sleep, } = require('./common');

describe('compositeRace', () => {
    describe('retireUpStream', () => {
        test('singleton race', async () => {
            const { race, retireUpStream, isActive, promise, } = await createRace();
            const before = Date.now();
            const racePromise = race(new Promise(res => setTimeout(res, 500)));
            await sleep(5);
            expect(isActive()).toBe(true);
            expect(retireUpStream()).toBe(0);
            let resolvedRes;
            promise.then((rid) => resolvedRes = rid);
            await racePromise;
            expect((Date.now()-before)<200).toBe(true);
            expect(isActive()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBe(0);
        });

        test('first should resolve second race', async () => {
            const { isActive, retireUpStream, extendRace,  promise, } = await createRace();
            const { isActive: isActive2, promise: promise2, } = await extendRace();
            await sleep(5);
            let resolvedRes = false;
            promise.then((rid) => resolvedRes = rid);
            let resolvedRes2 = false;
            promise2.then((rid) => resolvedRes2 = rid);
            await sleep(5);
            expect(resolvedRes).toBe(false);
            expect(resolvedRes2).toBe(false);

            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(true);
            const raceRid = await retireUpStream();
            expect(raceRid).toBe(0);
            expect(isActive()).toBe(false);
            expect(isActive2()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBe(0);
            expect(resolvedRes2).toBe(0);
        });

        test('first race should resolve second and third race', async () => {
            const { isActive, retireUpStream, extendRace, promise, } = await createRace();
            const { isActive: isActive2, extendRace: extendRace2, promise: promise2, } = await extendRace();
            const { isActive: isActive3, promise: promise3, } = await extendRace2();
            await sleep(5);
            let resolvedRes = false;
            promise.then((rid) => resolvedRes = rid);
            let resolvedRes2 = false;
            promise2.then((rid) => resolvedRes2 = rid);
            let resolvedRes3 = false;
            promise3.then((rid) => resolvedRes3 = rid);
            await sleep(5);
            expect(resolvedRes).toBe(false);
            expect(resolvedRes2).toBe(false);
            expect(resolvedRes3).toBe(false);

            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(true);
            expect(isActive3()).toBe(true);

            expect(await retireUpStream()).toBe(0);
            expect(isActive()).toBe(false);
            expect(isActive2()).toBe(false);
            expect(isActive3()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBe(0);
            expect(resolvedRes2).toBe(0);
            expect(resolvedRes3).toBe(0);
        });

        test('second race should resolve second and third race, but not first case', async () => {
            const { isActive, extendRace, promise, } = await createRace();
            const { isActive: isActive2, retireUpStream: retireUpStream2, extendRace: extendRace2, promise: promise2, } = await extendRace();
            const { isActive: isActive3, promise: promise3, } = await extendRace2();
            let resolvedRes;
            promise.then((rid) => resolvedRes = rid);
            let resolvedRes2;
            promise2.then((rid) => resolvedRes2 = rid);
            let resolvedRes3;
            promise3.then((rid) => resolvedRes3 = rid);
            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(true);
            expect(isActive3()).toBe(true);
            expect(await retireUpStream2()).toBe(1);
            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(false);
            expect(isActive3()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBeUndefined();
            expect(resolvedRes2).toBe(1);
            expect(resolvedRes3).toBe(1);
        });

        test('third should resolve first and second race', async () => {
            const { isActive, extendRace,  promise, } = await createRace();
            const { isActive: isActive2, extendRace: extendRace2, promise: promise2, } = await extendRace();
            const { isActive: isActive3, retireUpStream, promise: promise3, } = await extendRace2();
            let resolvedRes;
            promise.then((rid) => resolvedRes = rid);
            let resolvedRes2;
            promise2.then((rid) => resolvedRes2 = rid);
            let resolvedRes3;
            promise3.then((rid) => resolvedRes3 = rid);

            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(true);
            expect(isActive3()).toBe(true);
            const raceRid = await retireUpStream();
            expect(raceRid).toBe(2);
            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(true);
            expect(isActive3()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBeUndefined();
            expect(resolvedRes2).toBeUndefined();
            expect(resolvedRes3).toBe(2);
        });
    });
    describe('cancelCurrentStream', () => {
        test('singleton race', async () => {
            const { race, cancelCurrentStream, isActive, promise, } = await createRace();
            const before = Date.now();
            const racePromise = race(new Promise(res => setTimeout(res, 500)));
            await sleep(5);
            expect(isActive()).toBe(true);
            expect(cancelCurrentStream()).toBe(0);
            let resolvedRes;
            promise.then((rid) => resolvedRes = rid);
            await racePromise;
            expect((Date.now()-before)<100).toBe(true);
            expect(isActive()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBe(0);
        });

        test('first should resolve second race', async () => {
            const { isActive, cancelCurrentStream, extendRace,  promise, } = await createRace();
            const { isActive: isActive2, promise: promise2, } = await extendRace();
            await sleep(5);
            let resolvedRes = false;
            promise.then((rid) => resolvedRes = rid);
            let resolvedRes2 = false;
            promise2.then((rid) => resolvedRes2 = rid);
            await sleep(5);
            expect(resolvedRes).toBe(false);
            expect(resolvedRes2).toBe(false);

            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(true);
            const raceRid = await cancelCurrentStream();
            expect(raceRid).toBe(0);
            expect(isActive()).toBe(false);
            expect(isActive2()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBe(0);
            expect(resolvedRes2).toBe(0);
        });

        test('first race should resolve second and third race', async () => {
            const { isActive, cancelCurrentStream, extendRace, promise, } = await createRace();
            const { isActive: isActive2, extendRace: extendRace2, promise: promise2, } = await extendRace();
            const { isActive: isActive3, promise: promise3, } = await extendRace2();
            await sleep(5);
            let resolvedRes = false;
            promise.then((rid) => resolvedRes = rid);
            let resolvedRes2 = false;
            promise2.then((rid) => resolvedRes2 = rid);
            let resolvedRes3 = false;
            promise3.then((rid) => resolvedRes3 = rid);
            await sleep(5);
            expect(resolvedRes).toBe(false);
            expect(resolvedRes2).toBe(false);
            expect(resolvedRes3).toBe(false);

            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(true);
            expect(isActive3()).toBe(true);
            expect(await cancelCurrentStream()).toBe(0);
            expect(isActive()).toBe(false);
            expect(isActive2()).toBe(false);
            expect(isActive3()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBe(0);
            expect(resolvedRes2).toBe(0);
            expect(resolvedRes3).toBe(0);
        });

        test('second race should resolve second and third race, but not first case', async () => {
            const { isActive, extendRace, promise, } = await createRace();
            const { isActive: isActive2, cancelCurrentStream, extendRace: extendRace2, promise: promise2, } = await extendRace();
            const { isActive: isActive3, promise: promise3, } = await extendRace2();
            let resolvedRes;
            promise.then((rid) => resolvedRes = rid);
            let resolvedRes2;
            promise2.then((rid) => resolvedRes2 = rid);
            let resolvedRes3;
            promise3.then((rid) => resolvedRes3 = rid);

            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(true);
            expect(isActive3()).toBe(true);
            expect(await cancelCurrentStream()).toBe(1);
            expect(isActive()).toBe(false);
            expect(isActive2()).toBe(false);
            expect(isActive3()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBe(1);
            expect(resolvedRes2).toBe(1);
            expect(resolvedRes3).toBe(1);
        });

        test('third should resolve first and second race', async () => {
            const { isActive, extendRace,  promise, } = await createRace();
            const { isActive: isActive2, extendRace: extendRace2, promise: promise2, } = await extendRace();
            const { isActive: isActive3, cancelCurrentStream, promise: promise3, } = await extendRace2();
            let resolvedRes;
            promise.then((rid) => resolvedRes = rid);
            let resolvedRes2;
            promise2.then((rid) => resolvedRes2 = rid);
            let resolvedRes3;
            promise3.then((rid) => resolvedRes3 = rid);

            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(true);
            expect(isActive3()).toBe(true);
            const raceRid = await cancelCurrentStream();
            expect(raceRid).toBe(2);
            expect(isActive()).toBe(false);
            expect(isActive2()).toBe(false);
            expect(isActive3()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBe(2);
            expect(resolvedRes2).toBe(2);
            expect(resolvedRes3).toBe(2);
        });
    });
});
