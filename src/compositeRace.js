module.exports = async function createRace () {
    let races = 0;
    async function createCompositePromise () {
        const children = [];
        const race = races++;
        return new Promise(onPromiseCreated => {
            const _promise = new Promise(applyOnResolve => {
                let active = true;
                const self = {
                    resolve (resolver = race) {
                        active = false;
                        if (children) {
                            children.forEach(child => child.resolve(resolver));
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
                    compete (...promises) {
                        return Promise.race([ _promise, ...promises, ]);
                    },
                    async extend () {
                        const child = await createCompositePromise(self);
                        children.push(child);
                        return child;
                    },
                };
                onPromiseCreated(self);
            });
        }
        );
    }
    return createCompositePromise();
};

