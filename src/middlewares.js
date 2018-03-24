/* eslint-disable consistent-return */
const { sleep, createResolvable, } = require('./utils');

function prepareProvider ({ index = 0, name, callback, }) {
    return async function createProvider (downStream) {
        return {
            async onComplete (handle, upStreamRoot) {
                if (name === 'map') {
                    let value;
                    try {
                        value = callback();
                    } catch (e) {
                        downStream.onError(e, { index, name, value: callback, });
                    }
                    downStream.onNext({ value, handle, order: [ 0, ], upStream: upStreamRoot, callee: name, });
                    return downStream.onComplete(handle, upStreamRoot, name);
                } else if (name === 'callback') {
                    let i = 0;
                    const { resolve, promise, } = await createResolvable();
                    const toBeResolved = [];
                    callback({
                        compete: downStream.compete,
                        isActive: downStream.isActive,
                        async onNext (value) {
                            if (downStream.isActive()) {
                                const upStream = await upStreamRoot.extend();
                                const next = downStream.onNext({ value, handle, order: [ i++, ], upStream, callee: name, });
                                toBeResolved.push(next);
                                return next;
                            }
                        },
                        async onComplete () {
                            await downStream.compete(Promise.all(toBeResolved));
                            await downStream.onComplete(handle, upStreamRoot, name);
                            resolve();
                        },
                    });
                    return promise;
                } else if (name === 'generator') {
                    let generator = await callback();
                    let i = 0;
                    let result = {};
                    while (true) {
                        try {
                            result = await downStream.compete(generator.next(result.value));
                        } catch (e) {
                            downStream.onError(e, { middleware: { index, name, }, value: generator, });
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
                }
            },
        };
    };
}

function prepareParallel ({ params: { limit, }, name= 'parallel', }) {
    return async function createParallel (downStream) {
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
                await downStream.compete(Promise.all([ ...executions[handle].pending, executeFutures(handle), ]));
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
}

// Ok for emitter
function prepareDelay ({ index, callback, name ='delay', }) {
    return function createDelay (downStream) {
        let executions = {};
        async function createDelay (value, handle, order, upStream, callee) {
            let delay;
            try {
                delay = callback(value);
            } catch (e) {
                return downStream.onError(e, { value, order, middleware: { name, index, callee, }, });
            }
            await sleep(delay);
            downStream.onNext({ value, handle, order, upStream, callee: name, });
        }
        return {
            onStart (handle) {
                executions[handle] = [];
                return downStream.onStart(handle);
            },
            onNext ({ value, handle, order, upStream, callee, }) {
                if (downStream.isActive() && upStream.isActive()) {
                    const target = executions[handle];
                    target.push(upStream.compete(createDelay(value, handle, order, upStream, callee)));
                    return target[target.length-1];
                }
            },
            async onComplete (handle, upStreamRoot) {
                await downStream.compete(Promise.all(executions[handle]));
                return downStream.onComplete(handle, upStreamRoot, name);
            },
        };
    };
}

// Ok for emitter
function prepareAwait ({ index, name='await', }) {
    return function createAwait (downStream) {
        const executions = {};
        async function applyAwait (value, handle, order, upStream, callee) {
            let result;
            try {
                result = await value;
            } catch (e) {
                return downStream.onError(e, { value, middleware: { index, name, callee, }, });
            }
            downStream.onNext({ value: result, handle, order, upStream, callee: name, });
        }
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
    };
}

// Ok for emitter
function prepareGenerator ({ callback, name = 'generator', index, }) {
    return function createGenerator (downStream) {
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
}

function prepareReduceUntil ({ callback, index, name, params: { defaultValue, }, }) {
    return async function createReduceUntil (downStream) {
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
}

function prepareLast ({ index, callback, name = 'last', }) {
    return function createLast (downStream) {
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
}

function prepareOrdered ({ callback, index, name = 'ordered', }) {
    return async function createOrdered (downStream) {
        let executions = {};
        return {
            onStart (handle) {
                executions[handle] = {};
                return downStream.onStart(handle, name);
            },
            onNext ({ value, handle, order, upStream, }) {
                if (downStream.isActive()) {
                    executions[handle][order] = {
                        value,
                        task () {
                            downStream.onNext({ value, handle, order, upStream, callee: name, });
                        },
                    };
                }
            },
            onComplete (handle, upStreamRoot) {
                let runnables;
                try {
                    runnables = Object.entries(executions[handle]).sort(callback).map((e) => e[1].task);
                } catch (error) {
                    runnables = [];
                    return downStream.onError(error, { middleware: { name, index, }, value: executions[handle], });
                }
                let i = 0;
                while (runnables.length>i) runnables[i++]();
                return downStream.onComplete(handle, upStreamRoot, name);
            },
            onFinish (handle) {
                delete executions[handle];
                downStream.onFinish(handle);
            },
        };
    };
}

function prepareDefault ({ name = 'default', params: { defaultValue, }, }) {
    return function createDefault (downStream) {
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
}

function prepareReduce ({ name = 'reduce', index, callback, params: { acc, }, }) {
    return function createReducer (downStream) {
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
}

function prepareFilter ({ index, callback, name = 'filter', }) {
    return function createFilter (downStream) {
        return {
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
        };
    };
}

function prepareForEach ({ callback, index, name = 'forEach', }) {
    return function createForEach (downStream) {
        return {
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
        };
    };
}

function prepareMap ({ name = 'map', callback, index, }) {
    return function createMap (downStream) {
        return {
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
        };
    };
}

function prepareCatch ({ callback, index, name = 'catch', }) {
    return function createCatch (downStream) {
        return {
            onError (error, { value, middleware, continuousError= [], }, handle) {
                const errorDescription = { middleware, value: value === undefined ? '$undefined': value, continuousError, handle, };
                try {
                    callback(error, errorDescription);
                } catch (e) {
                    continuousError.push({ value: e, middleware: { index, name, }, handle, });
                    downStream.onError(e, errorDescription);
                }
            },
        };
    };
}

function preparePreUpStreamFilter ({ index, name, callback, }) {
    return async function createPreUpStreamFilter (downStream) {
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
}

function prepareTakeLimit ({ name, index, callback, }) {
    return async function createTakeLimit (downStream) {
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
}

module.exports = {
    prepareAwait,
    prepareParallel,
    prepareDelay,
    prepareGenerator,
    prepareProvider,
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
};
