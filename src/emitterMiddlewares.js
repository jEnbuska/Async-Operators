/* eslint-disable consistent-return */

function prepareFilter ({ index, callback, name = 'filter', }) {
    return function createFilter ({ isActive, onNext, onError, }) {
        return {
            onNext: function invokeFilter (value, order, scope) {
                if (isActive()) {
                    let accept;
                    try {
                        accept = callback(value);
                    } catch (e) {
                        return onError(e, { name, value, index, });
                    }
                    if (accept) {
                        return onNext(value, order, scope);
                    }
                }
            },
        };
    };
}

function prepareForEach ({ callback, index, }) {
    return function createForEach ({ onError, onNext, isActive, }) {
        return {
            onNext: function forEachOnNext (value, order, scope) {
                if (isActive()) {
                    try {
                        callback(value, scope);
                    } catch (e) {
                        return onError(e, { index, name: 'forEach', value, }, scope);
                    }
                    return onNext(value, order);
                }
            },
        };
    };
}

function prepareMap ({ name = 'map', callback, index, }) {
    return function createMap ({ onNext, isActive, onError,  }) {
        return {
            onNext: function mapOnNext (value, order, scope) {
                if (isActive()) {
                    let out;
                    try {
                        out = callback(value, scope);
                    } catch (e) {
                        return onError(e, { index, name, value, });
                    }
                    return onNext(out, order);
                }
            },
        };
    };
}

function prepareCatch ({ callback, index, name = 'catch', }) {
    const catcherName = name;
    return function createCatch ({ onError, }) {
        return {
            onError: function onCatch (error, { name, value, index: subjectIndex, continuousError= [], scope, }) {
                const errorDescription = { name, value: value === undefined ? '$undefined': value, index: subjectIndex, continuousError, scope, };
                try {
                    callback(error, errorDescription);
                } catch (e) {
                    continuousError.push({ value: e, index, name: catcherName, scope, });
                    onError(e, errorDescription);
                }
            },
        };
    };
}

function preparePreUpStreamFilter ({ index, name, callback, }) {
    return async function createPreUpStreamFilter ({ onNext, extendRace, onError, }) {
        const { isActive, retire, ...rest } = await extendRace(); // TODO how to reset pre upstream limiter?
        return {
            ...rest,
            retire,
            isActive,
            onNext: function preUpStreamFilterOnNext (value, order, scope) {
                if (isActive()) {
                    let accept;
                    try {
                        accept = callback(value);
                    } catch (e) {
                        return onError(e, { value, index, name, });
                    }
                    if (accept) {
                        return onNext(value, order, scope);
                    } else {
                        retire();
                    }
                }
            },
        };
    };
}

function preparePostUpstreamFilter ({ name, index, callback, }) {
    return async function createPostUpstreamFilter ({ onNext, onError, extendRace, }) {
        const { isActive, retire, ...rest } = await extendRace();
        return {
            ...rest, isActive, retire,
            onNext: function postUptreamFilterOnNext (value, order, scope) {
                if (isActive()) {
                    const res = onNext(value, order);
                    let stop;
                    try {
                        stop = callback(value, scope);
                    } catch (e) {
                        return onError(e, { value, index, name, });
                    }
                    if (stop) {
                        retire();
                    } else {
                        return res;
                    }
                }
            },
        };
    };
}

module.exports = {
    prepareFilter,
    prepareForEach,
    prepareMap,
    prepareCatch,
    preparePreUpStreamFilter,
    preparePostUpstreamFilter,
};
