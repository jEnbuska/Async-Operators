module.exports = async function createRace () {
    let races = 0;
    async function createCompositePromise (prev) {
        let next;
        const race = races++;
        return new Promise(onPromiseCreated => {
            const _promise = new Promise(applyOnResolve => {
                let active = true;
                const self = {
                    retireUpStream (resolver = race) {
                        active = false;
                        if (next) {
                            next.retireUpStream(resolver);
                        }
                        applyOnResolve(resolver);
                        return resolver;
                    },
                    cancelCurrentStream (resolver = race) {
                        active = false;
                        if (prev) {
                            prev.cancelCurrentStream (resolver);
                        } else if (next) {
                            next.retireUpStream(resolver);
                        }
                        applyOnResolve(resolver);
                        return resolver;
                    },
                    isActive () {
                        return active;
                    },
                    get promise () {
                        return _promise;
                    },
                    race (promise) {
                        return Promise.race([ promise, _promise, ]);
                    },
                    async extendRace () {
                        return next = await createCompositePromise(self);
                    },
                };
                onPromiseCreated(self);
            });
        }
        );
    }
    return createCompositePromise();
};

