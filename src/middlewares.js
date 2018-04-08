/* eslint-disable consistent-return */
const { sleep, } = require('./utils');

const prepareGeneratorProvider= ({ index = 0, name, callback, }) => async (downStream) => {
    const generator = await callback();
    let i = 0;
    let result = {};
    return {
        async onComplete (handle, upStreamRoot, callee) {
            while (true) {
                try {
                    result = await downStream.compete(generator.next(result.value));
                } catch (e) {
                    downStream.onError(e, { middleware: { index, name, callee, }, value: generator, });
                    if (downStream.isActive()) {
                        continue;
                    } else {
                        break;
                    }
                }
                if (result && !result.done && downStream.isActive() && upStreamRoot.isActive()) {
                    const { value, } = result;
                    const upStream = await upStreamRoot.extend();
                    downStream.onNext({ value, handle, order: [ i++, ], upStream, callee: name, });
                } else {
                    break;
                }
            }
            return downStream.onComplete(handle, upStreamRoot, name);
        },
    };
};

const prepareValueProvider = ({ name, params: { value, }, }) => downStream => ({
    async onComplete (handle, upStreamRoot) {
        downStream.onNext({ value, handle, order: [ 0, ], upStream: upStreamRoot, callee: name, });
        return downStream.onComplete(handle, upStreamRoot, name);
    },
});

const prepareCallbackProvider = ({ name, index = 0, callback, }) => downStream => {
    let i = 0;
    let completed;
    let promises = [];
    return {
        async onComplete (handle, upStreamRoot, callee) {
            try {
                callback({
                    ...upStreamRoot,
                    async onNext (value) {
                        if (!completed && downStream.isActive() && upStreamRoot.isActive()) {
                            const order = [ i++, ];
                            promises.push(upStreamRoot.extend().then((upStream) => downStream.onNext({ value, handle, upStream, order, callee: name, })));
                            return promises[promises.length-1];
                        } else {
                            console.error('onNext invoked from callback Provider after onComplete');
                        }
                    },
                    async onComplete () {
                        if (!completed) {
                            completed = true;
                            await Promise.all(promises);
                            await downStream.onComplete(handle, upStreamRoot, name);
                            upStreamRoot.resolve();
                        } else {
                            console.error('onComplete re-invoked from callback Provider');
                        }
                    },
                });
                return upStreamRoot.promise;
            } catch (e) {
                downStream.onError(e, { value: callback, middleware: { name, index, callee, }, });
            }
        },
    };
};

const prepareParallel = ({ params: { limit, }, name= 'parallel', }) => async downStream => {
    const executions = {};
    return {
        onStart (handle) {
            executions[handle] = {
                index: 0,
                futures: [],
                parallel: 0,
                pending: [],
            };
            return downStream.onStart(handle);
        },
        onNext ({ value, handle, order, upStream, }) {
            if (downStream.isActive() && upStream.isActive()) {
                const target = executions[handle];
                target.futures.push(async () => {
                    if (downStream.isActive() && upStream.isActive()) {
                        await upStream.compete(downStream.onNext({ value, handle, order, upStream, callee: name, }));
                    }
                });
                if (target.parallel!==limit) {
                    const promise = executeFutures(handle, upStream);
                    target.pending.push(promise);
                    return promise;
                }
            }
        },
        async onComplete (handle, upStreamRoot) {
            await downStream.compete(Promise.all([ Promise.all(executions[handle].pending), executeFutures(handle), ]));
            return downStream.onComplete(handle, upStreamRoot, name);
        },
        onFinish (handle) {
            delete executions[handle];
            downStream.onFinish(handle);
        },
    };
    async function executeFutures (handle) {
        const context = executions[handle];
        const resolveNow = [];
        const to = context.index + (limit ? limit-context.parallel: context.futures.length);
        while (context.index < to && context.futures.length > context.index)
            resolveNow.push(context.futures[context.index++]);
        context.parallel+=resolveNow.length;
        const promises = resolveNow.map(async function (createPromise) {
            await createPromise();
            context.parallel--;
            return executeFutures(handle);
        });
        return Promise.all(promises);
    }
};

const prepareDelay = ({ index, callback, name ='delay', }) => async downStream => {
    const executions = {};
    return {
        onStart (handle) {
            executions[handle] = [];
            return downStream.onStart(handle);
        },
        onNext ({ value, handle, order, upStream, callee, }) {
            if (downStream.isActive() && upStream.isActive()) {
                const target = executions[handle];
                target.push(upStream.compete(applyDelay(value, handle, order, upStream, callee)));
                return target[target.length-1];
            }
        },
        async onComplete (handle, upStreamRoot) {
            await downStream.compete(Promise.all(executions[handle]));
            return downStream.onComplete(handle, upStreamRoot, name);
        },
        onFinish (handle) {
            delete executions[handle];
            return downStream.onFinish(handle);
        },
    };
    async function applyDelay (value, handle, order, upStream, callee) {
        try {
            await sleep(callback(value));
        } catch (e) {
            return downStream.onError(e, { value, order, middleware: { name, index, callee, }, });
        }
        downStream.onNext({ value, handle, order, upStream, callee: name, });
    }
};

// Ok for emitter
const prepareAwait = ({ index, name='await', }) => downStream => {
    const executions = {};
    return {
        onStart (handle) {
            executions[handle] = [];
            return downStream.onStart(handle, name);
        },
        onNext ({ value, handle, order, upStream, callee, }) {
            if (downStream.isActive() && upStream.isActive()) {
                const promise = upStream.compete(applyAwait(value, handle, order, upStream, callee));
                executions[handle].push(promise);
                return promise;
            }
        },
        async onComplete (handle, upStreamRoot) {
            await downStream.compete(Promise.all(executions[handle]));
            return downStream.onComplete(handle, upStreamRoot, name);
        },
        onFinish (handle) {
            delete executions[handle];
            downStream.onFinish(handle);
        },
    };
    async function applyAwait (value, handle, order, upStream, callee) {
        let result;
        try {
            result = await value;
        } catch (e) {
            return downStream.onError(e, { value, middleware: { index, name, callee, }, });
        }
        downStream.onNext({ value: result, handle, order, upStream, callee: name, });
    }
};

// Ok for emitter
const prepareGenerator = ({ callback, name = 'generator', index, }) => downStream => {
    const executions = {};
    return {
        onStart (handle) {
            executions[handle] = [];
            downStream.onStart(handle, name);
        },
        onNext ({ value, handle, order, upStream, callee, }) {
            if (downStream.isActive() && upStream.isActive()) {
                const promise = upStream.compete(generatorResolver(value, handle, order, upStream, callee));
                executions[handle].push(promise);
                return promise;
            }
        },
        async onComplete (handle, upStreamRoot) {
            await downStream.compete(Promise.all(executions[handle]));
            return downStream.onComplete(handle, upStreamRoot, name);
        },
        onFinish (handle) {
            delete executions[handle];
            downStream.onFinish(handle);
        },
    };
    async function generatorResolver (value, handle, order = [ 0, ], upStream, callee) {
        let gen;
        gen = await callback(value);
        let result = {};
        let i = 0;
        const promises = [];
        do {
            try {
                result = await gen.next(result.value);
            } catch (e) {
                downStream.onError(e, { value: gen, middleware: { index, name, callee, }, });
                continue;
            }
            if (result && !result.done) {
                const { value, } = result;
                const upStreamRace = await upStream.extend();
                promises.push(downStream.onNext({ value, handle, order: [ ...order, i++, ], upStream: upStreamRace, callee: name, }));
                continue;
            }
            break;
        } while (downStream.isActive() && upStream.isActive());
        return Promise.all(promises);
    }
};

const prepareReduceUntil = ({ callback, index, name, params: { defaultValue, }, }) => async downStream => {
    const executions = {};
    const self = await downStream.extend();
    return {
        ...self,
        onStart (handle) {
            executions[handle] = defaultValue;
        },
        onNext ({ value, handle, upStream, }) {
            if (self.isActive() && upStream.isActive()) {
                let next;
                try {
                    next = callback(value);
                } catch (e) {
                    return downStream.onError(e, { value, index, name, });
                }
                executions[handle]= next.value;
                if (next.done) {
                    self.resolve();
                }
            }
        },
        async onComplete (handle, upStreamRoot) {
            downStream.onNext({ value: executions[handle], handle, order: [ 0, ], upStream: upStreamRoot, callee: name, });
            return downStream.onComplete(handle, upStreamRoot, name);
        },
        onFinish (handle) {
            delete executions[handle];
            downStream.onFinish(handle);
        },
    };
};

const prepareLast = ({ index, callback, name = 'last', }) => downStream => {
    const executions = {};
    return {
        onStart (handle) {
            executions[handle] = [];
            return downStream.onStart(handle);
        },
        onNext ({ value, handle, order, upStream, callee, }) {
            if (downStream.isActive() && upStream.isActive()) {
                try {
                    executions[handle] = callback(value, executions[handle]);
                } catch (e) {
                    return downStream.onError(e, { value, middleware: { index, name, callee, }, });
                }
                executions[handle].push({ value, task: () => {
                    downStream.onNext({ value, handle, order, upStream, callee: name, });
                }, });
            }
        },
        async onComplete (handle, upStreamRoot) {
            executions[handle].forEach(next => next.task());
            return downStream.onComplete(handle, upStreamRoot, name);
        },
        onFinish (handle) {
            delete executions[handle];
            downStream.onFinish(handle);
        },
    };
};

const prepareOrdered = ({ callback, index, name = 'ordered', }) => downStream => {
    let executions = {};
    return {
        onStart (handle) {
            executions[handle] = [];
            return downStream.onStart(handle, name);
        },
        onNext ({ value, handle, order, upStream, }) {
            if (downStream.isActive()) {
                executions[handle].push({ order, value, task () {
                    downStream.onNext({ value, handle, order, upStream, callee: name, });
                }, });
            }
        },
        onComplete (handle, upStreamRoot) {
            let runnables;
            try {
                runnables = executions[handle].sort(callback).map((e) => e.task);
            } catch (error) {
                runnables = [];
                return downStream.onError(error, { middleware: { name, index, }, value: executions[handle], });
            }
            for (const next of runnables) next();
            return downStream.onComplete(handle, upStreamRoot, name);
        },
        onFinish (handle) {
            delete executions[handle];
            downStream.onFinish(handle);
        },
    };
};

const prepareDefault = ({ name = 'default', params: { defaultValue, }, }) => downStream => {
    const executions = {};
    return {
        onStart (handle) {
            executions[handle] = false;
            downStream.onStart(handle, name);
        },
        onNext ({ value, handle, order, upStream, }) {
            if (downStream.isActive() && upStream.isActive()) {
                executions[handle] = true;
                return downStream.onNext({ value, handle, order, upStream, callee: name, });
            }
        },
        onComplete (handle, upStreamRoot) {
            if (!executions[handle]) downStream.onNext({ value: defaultValue, handle, order: [ 0, ], upStream: upStreamRoot, callee: name, });
            return downStream.onComplete(handle, upStreamRoot, name);
        },
        onFinish (handle) {
            delete executions[handle];
            downStream.onFinish(handle);
        },
    };
};

const prepareReduce = ({ name = 'reduce', index, callback, params: { acc, }, }) => downStream => {
    const executions = {};
    return {
        onStart (handle) {
            executions[handle] = acc;
            downStream.onStart(handle, name);
        },
        onNext ({ value, handle, upStream, callee, }) {
            if (upStream.isActive() && downStream.isActive()) {
                try {
                    executions[handle] = callback(executions[handle], value);
                } catch (e) {
                    return downStream.onError(e, { middleware: { index, name, callee, }, value, });
                }
            }
        },
        onComplete (handle, upStreamRoot) {
            downStream.onNext({ value: executions[handle], handle, order: [ 0, ], upStream: upStreamRoot, callee: name, });
            return downStream.onComplete(handle, upStreamRoot, name);
        },
        onFinish (handle) {
            delete executions[handle];
            downStream.onFinish(handle);
        },
    };
};

const prepareFilter = ({ index, callback, name = 'filter', }) =>  (downStream) => ({
    onNext ({ value, handle, order, upStream, callee, }) {
        if (upStream.isActive() && downStream.isActive()) {
            let accept;
            try {
                accept = callback(value);
            } catch (e) {
                return downStream.onError(e, { middleware: { name, value, callee, }, index, });
            }
            if (accept) {
                return downStream.onNext({ value, handle, order, upStream, callee: name, });
            }
        }
    },
});

const prepareForEach = ({ callback, index, name = 'forEach', }) => async (downStream) => ({
    onNext ({ value, handle, order, upStream, callee, }) {
        if (upStream.isActive() && downStream.isActive()) {
            try {
                callback(value);
            } catch (e) {
                return downStream.onError(e, { value, middleware: { index, name, callee, }, }, handle);
            }
            return downStream.onNext({ value, handle, order, upStream, callee: name, });
        }
    },
});

const prepareMap = ({ name = 'map', callback, index, }) => (downStream) => ({
    onNext ({ value, handle, order, upStream, callee, }) {
        if (upStream.isActive() && downStream.isActive()) {
            let out;
            try {
                out = callback(value);
            } catch (e) {
                return downStream.onError(e, { middleware: { index, name, callee, }, value, });
            }
            return downStream.onNext({ value: out, handle, order, upStream, callee: name, });
        }
    },
});

const prepareCatch = ({ callback, index, name = 'catch', }) => (downStream) => ({
    onError (error, { value, middleware, continuousError= [], }, handle) {
        const errorDescription = { middleware, value: value === undefined ? '$undefined': value, continuousError, handle, };
        try {
            callback(error, errorDescription);
        } catch (e) {
            continuousError.push({ value: e, middleware: { index, name, }, handle, });
            downStream.onError(e, errorDescription);
        }
    },
});

const preparePreUpStreamFilter = ({ index, name, callback, }) => async (downStream) => {
    const self = await downStream.extend();
    return {
        ...self,
        onNext ({ value, handle, order, upStream, callee, }) {
            if (self.isActive() && upStream.isActive()) {
                let accept;
                try {
                    accept = callback(value);
                } catch (e) {
                    return downStream.onError(e, { value, middleware: { index, name, callee, }, });
                }
                if (accept) {
                    return downStream.onNext({ value, handle, order, upStream, callee: name, });
                } else {
                    self.resolve();
                }
            }
        },
    };
};

const prepareTakeLimit = ({ name, index, callback, }) => async (downStream) => {
    const self = await downStream.extend();
    return {
        ...self,
        onNext ({ value, handle, order, upStream, callee, }) {
            if (self.isActive() && upStream.isActive()) {
                const res = downStream.onNext({ value, handle, order, upStream, callee: name, });
                let stop;
                try {
                    stop = callback(value);
                } catch (e) {
                    return downStream.onError(e, { value, middleware: { index, name, callee, }, });
                }
                if (stop) {
                    self.resolve();
                } else {
                    return res;
                }
            }
        },
    };
};

const prepareDownStreamFilter = ({ name, callback, }) => (downStream) => ({
    onNext ({ value, handle, order, upStream, }) {
        if (downStream.isActive() && upStream.isActive()) {
            callback(upStream, value);
            return downStream.onNext({ value, order, handle, upStream, callee: name, });
        }
    },
});

module.exports = {
    prepareValueProvider,
    prepareGeneratorProvider,
    prepareCallbackProvider,
    prepareAwait,
    prepareParallel,
    prepareDelay,
    prepareGenerator,
    prepareLast,
    prepareReduceUntil,
    prepareDefault,
    prepareOrdered,
    prepareReduce,
    prepareFilter,
    prepareForEach,
    prepareMap,
    prepareCatch,
    preparePreUpStreamFilter,
    prepareTakeLimit,
    prepareDownStreamFilter,
};
