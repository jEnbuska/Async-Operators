const createRace = require('../src/compositeRace');
const { sleep, createDuration, } = require('./common');

describe('compositeRace', () => {
    describe('resolve', () => {
        test('singleton race', async () => {
            const { compete, resolve, isActive, promise, } = await createRace();
            const getDuration = createDuration();
            const racePromise = compete(new Promise(res => setTimeout(res, 500)));
            await sleep(5);
            expect(isActive()).toBe(true);
            expect(resolve()).toBe(0);
            let resolvedRes;
            promise.then((rid) => resolvedRes = rid);
            await racePromise;
            expect(getDuration().time<200).toBe(true);
            expect(isActive()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBe(0);
        });

        test('first should resolve second race', async () => {
            const { isActive, resolve, extend,  promise, } = await createRace();
            const { isActive: isActive2, promise: promise2, } = await extend();
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
            const raceRid = await resolve();
            expect(raceRid).toBe(0);
            expect(isActive()).toBe(false);
            expect(isActive2()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBe(0);
            expect(resolvedRes2).toBe(0);
        });

        test('first race should resolve second and third race', async () => {
            const { isActive, resolve, extend, promise, } = await createRace();
            const { isActive: isActive2, extend: extend2, promise: promise2, } = await extend();
            const { isActive: isActive3, promise: promise3, } = await extend2();
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

            expect(await resolve()).toBe(0);
            expect(isActive()).toBe(false);
            expect(isActive2()).toBe(false);
            expect(isActive3()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBe(0);
            expect(resolvedRes2).toBe(0);
            expect(resolvedRes3).toBe(0);
        });

        test('second race should resolve second and third race, but not first case', async () => {
            const { isActive, extend, promise, } = await createRace();
            const { isActive: isActive2, resolve: resolve2, extend: extend2, promise: promise2, } = await extend();
            const { isActive: isActive3, promise: promise3, } = await extend2();
            let resolvedRes;
            promise.then((rid) => resolvedRes = rid);
            let resolvedRes2;
            promise2.then((rid) => resolvedRes2 = rid);
            let resolvedRes3;
            promise3.then((rid) => resolvedRes3 = rid);
            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(true);
            expect(isActive3()).toBe(true);
            expect(await resolve2()).toBe(1);
            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(false);
            expect(isActive3()).toBe(false);
            await sleep(5);
            expect(resolvedRes).toBeUndefined();
            expect(resolvedRes2).toBe(1);
            expect(resolvedRes3).toBe(1);
        });

        test('third should resolve first and second race', async () => {
            const { isActive, extend,  promise, } = await createRace();
            const { isActive: isActive2, extend: extend2, promise: promise2, } = await extend();
            const { isActive: isActive3, resolve, promise: promise3, } = await extend2();
            let resolvedRes;
            promise.then((rid) => resolvedRes = rid);
            let resolvedRes2;
            promise2.then((rid) => resolvedRes2 = rid);
            let resolvedRes3;
            promise3.then((rid) => resolvedRes3 = rid);

            expect(isActive()).toBe(true);
            expect(isActive2()).toBe(true);
            expect(isActive3()).toBe(true);
            const raceRid = await resolve();
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

});
