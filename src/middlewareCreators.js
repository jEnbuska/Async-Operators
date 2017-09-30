/* eslint-disable consistent-return */
import Or from './CompositeOr';
import And, { returnTrue, } from './CompositeAnd';
import { NOT_SET, createSet, orderComparator, entries, entriesToObject, has, sleep, values, } from './utils';

export function share (stem) {
  let count = 0;
  return function useShared ({ upStreamActive, resolve, nextMiddleware, observed = Or(), onComplete, }) {
    stem.followers[count++] = { resolve, nextMiddleware, upStreamActive, observed, onComplete, };
    return {
      observed,
      upStreamActive: stem.upStreamActive,
      nextMiddleware: stem.nextMiddleware,
      resolve: stem.resolve,
      onComplete: stem.onComplete,
    };
  };
}
export function peek (callback) {
  return function createPeek ({ upStreamActive, nextMiddleware, observed = Or(), }) {
    return {
      nextMiddleware: async function invokePeek (val, order, taskActive) {
        if (observed.call() && taskActive.call() && upStreamActive.call()) {
          callback(val);
          await nextMiddleware(val, order, taskActive);
        }
      },
    };
  };
}

export function latestBy (selector) {
  return function createLatestBy ({ nextMiddleware, upStreamActive, observed = Or(), }) {
    const previous = {};
    return {
      nextMiddleware: async function invokeLatestBy (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          const key = await selector(val);
          const selectorIdentity = previous[key] = has.call(previous, key) ? previous[key] + 1 : 0;
          await nextMiddleware(val, order, taskActive.concat(() => selectorIdentity === previous[key]));
        }
      },
    };
  };
}

export function debounceTime (ms) {
  return function createDebounceTime ({ nextMiddleware, upStreamActive, observed, }) {
    let requests = 0;
    return {
      nextMiddleware: async function invokeDebounceTime (val, order, taskActive) {
        if (observed.call() && taskActive.call() && upStreamActive.call()) {
          const request = ++requests;
          await sleep(ms);
          if (request === requests && observed.call() && taskActive.call() && upStreamActive.call()) {
            await nextMiddleware(val, order, taskActive);
          }
        }
      },
    };
  };
}
export function ordered () {
  return function createOrdered ({ nextMiddleware, upStreamActive, resolve, observed = Or(), }) {
    const tasks = {};
    return {
      resolve: async function resolveOrdered () {
        const runnables = entries(tasks)
          .sort((e1, e2) => orderComparator(e1[0], e2[0]))
          .map((e) => e[1]);
        for (let i = 0; i < runnables.length; i++) {
          await runnables[i]();
          if (!upStreamActive.call()) {
            break;
          }
        }
        if (resolve) {
          return resolve();
        }
      },
      nextMiddleware: async function invokeOrdered (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          tasks[order] = () => taskActive.call() && nextMiddleware(val, order, taskActive);
        }
      },
    };
  };
}

export function flatten (iterator) {
  return function createFlatten ({ nextMiddleware, upStreamActive, observed = Or(), }) {
    return {
      nextMiddleware: async function invokeFlatten (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          const iterable = await iterator(val);
          let i = 0;
          for (const v of iterable) {
            if (observed.call() && upStreamActive.call() && taskActive.call()) {
              await nextMiddleware(v, [ ...order, i++, ], taskActive);
            } else {
              break;
            }
          }
        }
      },
    };
  };
}

export function map (mapper) {
  return function createMap ({ nextMiddleware, upStreamActive, observed = Or(),  }) {
    return {
      nextMiddleware: async function invokeMap (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          await nextMiddleware(await mapper(val), order, taskActive);
        }
      },
    };
  };
}

export function awaitResolved () {
  return function createAwaitResolved ({ nextMiddleware, upStreamActive, observed = Or(), }) {
    return {
      nextMiddleware: async function invokeAwaitResolved (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          val = await val;
          await nextMiddleware(val, order, taskActive);
        }
      },
    };
  };
}

export function parallel () {
  return function createParallel ({ nextMiddleware, upStreamActive, resolve, observed = Or(), }) {
    const tasks = [];
    return {
      resolve: async function resolveParallel () {
        await Promise.all(tasks);
        if (resolve) {
          await resolve();
        }
      },
      nextMiddleware: async function invokeParallel (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          tasks.push(nextMiddleware(val, order, taskActive));
        }
      },
    };
  };
}

export function pick (keys) {
  const keySet = createSet(keys);
  return function createPick ({ nextMiddleware, upStreamActive, observed = Or(), }) {
    return {
      nextMiddleware: async function invokePick (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          val = entries(val)
            .filter(e => keySet[e[0]])
            .reduce(entriesToObject, {});
          await nextMiddleware(val, order, taskActive);
        }
      },
    };
  };
}

export function distinctBy (picker) {
  return function createDistinctBy ({ nextMiddleware, upStreamActive, observed = Or(), }) {
    const history = {};
    return {
      nextMiddleware: async function invokeDistinctBy (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          const key = await picker(val);
          if (!history[key]) {
            history[key] = true;
            await nextMiddleware(val, order, taskActive);
          }
        }
      },
    };
  };
}

export function filter (predicate) {
  return function createFilter ({ upStreamActive, nextMiddleware, observed = Or(), }) {
    return {
      nextMiddleware: async function invokeFilter (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call() && await predicate(val)) {
          await nextMiddleware(val, order, taskActive);
        }
      },
    };
  };
}

export function where (matcher) {
  const matchEntries = entries(matcher);
  return function createWhere ({ upStreamActive, nextMiddleware, observed = Or(),  }) {
    return {
      nextMiddleware: async function invokeWhere (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          for (const e of matchEntries) {
            if (val[e[0]] !== e[1]) {
              return;
            }
          }
          await nextMiddleware(val, order, taskActive);
        }
      },
    };
  };
}

export function skipWhile (predicate) {
  return function createSkipWhile ({ upStreamActive, nextMiddleware, observed = Or(), }) {
    let take = false;
    return {
      nextMiddleware: async function invokeSkipWhile (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call() && (take || (take = !await predicate(val)))) {
          await nextMiddleware(val, order, taskActive);
        }
      },
    };
  };
}

export function scan (scanner, acc) {
  return function createScan ({ upStreamActive, nextMiddleware, observed = Or(), }) {
    let innerAcc = acc;
    let futures = [];
    return {
      nextMiddleware: async function invokeScan (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          futures.push(async (input) => {
            const result = await scanner(input, val);
            innerAcc = result;
            await nextMiddleware(result, order, taskActive);
          });
          if (futures.length===1) {
            for (let i = 0; i<futures.length; i++) {
              await futures[i](innerAcc);
              if (!observed.call() && upStreamActive.call() && taskActive.call()) {
                break;
              }
            }
            futures = [];
          }
        }
      },
    };
  };
}

export function takeUntil (predicate) {
  return function createTakeUntil ({ onComplete, upStreamActive, nextMiddleware, observed = Or(), }) {
    let take = true;
    let completed = false;
    return {
      upStreamActive: upStreamActive.concat(() => take),
      nextMiddleware: async function invokeTakeUntil (val, order, taskActive) {
        if (take) {
          if (take = !await predicate(val) && take) {
            if (take && observed.call() && upStreamActive.call() && taskActive.call()) {
              await nextMiddleware(val, order, taskActive);
            }
          } else if (!completed) {
            completed = true;
            await onComplete();
          }
        }
      },
    };
  };
}

export function takeWhile (predicate) {
  return function createTakeWhile (val) {
    const { onComplete, upStreamActive, nextMiddleware, observed = Or(), } = val;
    let take = true;
    let completed = false;

    return {
      upStreamActive: upStreamActive.concat(() => take),
      nextMiddleware: async function invokeTakeWhile (val, order, taskActive) {
        if (take) {
          if (take = await predicate(val) && take) {
            if (observed.call() && upStreamActive.call() && taskActive.call()) {
              await nextMiddleware(val, order, taskActive);
            }
          } else if (!completed) {
            completed = true;
            await onComplete();
          }
        }
      },
    };
  };
}

export function skip (count) {
  count = Number(count) || 0;
  return function createSkip ({ upStreamActive, nextMiddleware, observed = Or(), }) {
    let total = 0;
    return {
      nextMiddleware: async function invokeSkip (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          if (total>=count) {
            await nextMiddleware(val, order, taskActive);
          } else {
            total++;
          }
        }
      },
    };
  };
}
export function take (max) {
  max = Number(max) || 0;
  return function createTake ({ upStreamActive, nextMiddleware, observed = Or(), }) {
    let taken = 0;
    upStreamActive = upStreamActive.concat(() => taken < max);
    return {
      upStreamActive,
      nextMiddleware: async function invokeTake (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          taken++;
          await nextMiddleware(val, order, taskActive);
        }
      },
    };
  };
}

// Behavior resets after every propose / push (takeLast, sum, reduce, some, every)
export function takeLast (n = 1) {
  return function createTakeLast ({ nextMiddleware, upStreamActive, resolve, observed = Or(), }) {
    let all = [];
    return {
      resolve: function resolveTakeLast () {
        if (upStreamActive.call() && observed.call()) {
          nextMiddleware(all.slice(all.length-n, all.length), [ 0, ], And());
        }
        all = [];
        resolve();
      },
      nextMiddleware: async function invokeTakeLast (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          all.push(val);
        }
      },
    };
  };
}

export function sum () {
  return function createSum ({ nextMiddleware, upStreamActive, resolve, observed = Or(), }) {
    let total = 0;
    return {
      resolve: async function resolveSum () {
        if (upStreamActive.call() && observed.call()) {
          await nextMiddleware(total, [ 1, ], And());
        }
        total = 0;
        return resolve();
      },
      nextMiddleware: async function invokeSum (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          total +=val;
        }
      },
    };
  };
}

export function reduce (reducer, acc) {
  return function createReduce ({ nextMiddleware, upStreamActive, resolve, observed = Or(), }) {
    let output = acc;
    let futures = [];
    return {
      resolve: async function resolveReduce () {
        if (upStreamActive.call() && observed.call()) {
          await nextMiddleware(output, [ 1, ], And());
        }
        output = acc;
        return resolve();
      },
      nextMiddleware: async function invokeReduce (val, order, taskActive) {
        if (observed.call() && upStreamActive.call() && taskActive.call()) {
          futures.push((result) => reducer(result, val, order, taskActive));
          if (futures.length===1) {
            for (let i = 0; i<futures.length; i++) {
              output = await futures[i](output);
            }
            futures = [];
          }
        }
      },
    };
  };
}

export function some (predicate) {
  return function createSome ({ nextMiddleware, upStreamActive, resolve, observed = Or(),  }) {
    let output = false;
    return {
      upStreamActive: upStreamActive.concat(() => !output),
      resolve: async function resolveSome () {
        if (upStreamActive.call() && observed.call()) {
          await nextMiddleware(output, [ 0, ], And());
        }
        output = false;
        return resolve();
      },
      nextMiddleware: async function invokeSome (val, order, taskActive) {
        if (!output && observed.call() && upStreamActive.call() && taskActive.call()) {
          const result = !!await predicate(val);
          output = result || output;
        }
      },
    };
  };
}

export function every (predicate) {
  return function createEvery ({ nextMiddleware, upStreamActive, resolve, observed = Or(),  }) {
    let output = true;

    return {
      upStreamActive: upStreamActive.concat(() => output),
      resolve: async function resolveEvery () {
        if (upStreamActive.call() && observed.call()) {
          await nextMiddleware(output, [ 0, ], And());
        }
        output = true;
        return resolve();
      },
      nextMiddleware: async function invokeEvery (val, order, taskActive) {
        if (output && observed.call() && upStreamActive.call() && taskActive.call()) {
          const result = !!await predicate(val);
          output = result && output;
        }
      },
    };
  };
}