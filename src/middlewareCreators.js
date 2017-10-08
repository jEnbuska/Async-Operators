/* eslint-disable consistent-return */
const { NOT_SET, createSet, orderComparator, entriesToObject, } = require('./utils');

function first () {
  return function createFirst ({ resolve, upStreamActive, nextMiddleware, }) {
    let value = NOT_SET;
    upStreamActive = upStreamActive.concat(() => value === NOT_SET);
    return {
      upStreamActive,
      resolve: async function resolveFirst () {
        const output = value;
        value = NOT_SET;
        await nextMiddleware(output, []);
        await resolve();
      },
      nextMiddleware: function createFirst (val) {
        if (upStreamActive.call()) {
          value = val;
        }
      },
    };
  };
}

function entries () {
  return function createEntries ({ nextMiddleware, upStreamActive, }) {
    return {
      nextMiddleware: function invokeEntries (val, order) {
        if (upStreamActive.call()) {
          return nextMiddleware(Object.entries(val), order);
        }
      },
    };
  };
}

function keys () {
  return function createKeys ({ nextMiddleware, upStreamActive, }) {
    return {
      nextMiddleware: function invokeKeys (val, order) {
        if (upStreamActive.call()) {
          return nextMiddleware(Object.keys(val), order);
        }
      },
    };
  };
}

function values () {
  return function createValues ({ nextMiddleware, upStreamActive, }) {
    return {
      nextMiddleware: function invokeValues (val, order) {
        if (upStreamActive.call()) {
          return nextMiddleware(Object.values(val), order);
        }
      },
    };
  };
}

function default$ (defaultValue) {
  return function createDefault ({ nextMiddleware, resolve, upStreamActive, }) {
    let isSet = false;
    return {
      resolve: async function resolveDefault () {
        if (!isSet) {
          await nextMiddleware(defaultValue);
        } else {
          isSet = false;
        }
        await resolve();
      },
      nextMiddleware: function invokeDefault (val) {
        if (upStreamActive.call()) {
          isSet = true;
          return nextMiddleware(val);
        }
      },
    };
  };
}

function reverse () {
  return function createReverse ({ nextMiddleware, upStreamActive, resolve, }) {
    let futures = [];
    return {
      resolve: async function resolveReversed () {
        const runnables = futures.reverse();
        futures = [];
        // eslint-disable-next-line no-empty
        for (let i = 0; i < runnables.length && await runnables[i](); i++) {}
        await resolve();
      },
      nextMiddleware: function invokeReverse (val, order) {
        if (upStreamActive.call()) {
          futures.push(() => nextMiddleware(val, order));
          return true;
        }
      },
    };
  };
}

function sort (comparator) {
  return function createSort ({ nextMiddleware, upStreamActive, resolve, }) {
    let futures = [];
    return {
      resolve: async function resolveSort () {
        const runnables = futures.sort(function (a, b) {
          return comparator(a.val, b.val);
        });
        futures = [];
        // eslint-disable-next-line no-empty
        for (let i = 0; i < runnables.length && await runnables[i].task(); i++) {}
        return resolve();
      },
      nextMiddleware: function invokeReverse (val, order) {
        if (upStreamActive.call()) {
          futures.push({ val, task: () => nextMiddleware(val, order), });
          return true;
        }
      },
    };
  };
}

function peek (callback) {
  return function createPeek ({ upStreamActive, nextMiddleware, }) {
    return {
      nextMiddleware: function invokePeek (val, order) {
        if (upStreamActive.call()) {
          callback(val);
          return nextMiddleware(val, order);
        }
      },
    };
  };
}

function toArray () {
  return function createToArray ({ upStreamActive, nextMiddleware, resolve, }) {
    let acc = [];
    return {
      resolve: async function resolveToArray () {
        const result = acc;
        acc = [];
        await nextMiddleware(result);
        await resolve();
      },
      nextMiddleware: function invokeToArray (val) {
        if (upStreamActive.call()) {
          acc.push(val);
          return true;
        }
      },
    };
  };
}

function toSet (picker) {
  return function createToArray ({ upStreamActive, nextMiddleware, resolve, }) {
    let acc = new Set();
    return {
      resolve: async function resolveToSet () {
        let result = acc;
        acc = new Set();
        await nextMiddleware(result);
        await resolve();
      },
      nextMiddleware: function invokeToSet (val) {
        if (upStreamActive.call()) {
          acc.add(picker(val));
          return true;
        }
      },
    };
  };
}

function toObject (picker) {
  return function createToObject ({ upStreamActive, nextMiddleware, resolve, }) {
    let acc = {};
    return {
      resolve: async function resolveToObject () {
        const result = acc;
        acc = {};
        await nextMiddleware(result);
        await resolve();
      },
      nextMiddleware: function invokeToObject (val) {
        if (upStreamActive.call()) {
          acc[picker(val)] = val;
          return true;
        }
      },
    };
  };
}

function toObjectSet (picker) {
  return function createToArray ({ upStreamActive, nextMiddleware, resolve, }) {
    let acc = {};
    return {
      resolve: async function resolveToObjectSet () {
        let result = acc;
        acc = {};
        await nextMiddleware(result);
        await resolve();
      },
      nextMiddleware: function invokeToObjectSet (val) {
        if (upStreamActive.call()) {
          acc[picker(val)] = true;
          return true;
        }
      },
    };
  };
}
function toMap (picker) {
  return function createToMap ({ upStreamActive, nextMiddleware, resolve, }) {
    let acc = new Map();
    return {
      resolve: async function resolveToMap () {
        const result = acc;
        acc = new Map();
        await nextMiddleware(result);
        await resolve();
      },
      nextMiddleware: function invokeToObject (val) {
        if (upStreamActive.call()) {
          acc.set(picker(val), val);
          return true;
        }
      },
    };
  };
}

function ordered () {
  return function createOrdered ({ nextMiddleware, upStreamActive, resolve, }) {
    let futures = {};
    return {
      resolve: async function resolveOrdered () {
        const runnables = Object.entries(futures).sort((e1, e2) => orderComparator(e1[0], e2[0])).map((e) => e[1]);
        futures = {};
        // eslint-disable-next-line no-empty
        for (let i = 0; i < runnables.length && await runnables[i](); i++) {}
        await resolve();
      },
      nextMiddleware: function invokeOrdered (val, order) {
        if (upStreamActive.call()) {
          futures[order] = () => nextMiddleware(val, order);
          return true;
        }
      },
    };
  };
}

function flatten (iterator) {
  return function createFlatten ({ nextMiddleware, upStreamActive, }) {
    return {
      nextMiddleware: async function invokeFlatten (val, order) {
        if (upStreamActive.call()) {
          const iterable = iterator(val);
          for (let i = 0; i<iterable.length; i++) {
            const flattenResult = await nextMiddleware(iterable[i], [ ...order, i, ]);
            if (!flattenResult) {
              return false;
            }
          }
          return true;
        }
      },
    };
  };
}

function map (mapper) {
  return function createMap ({ nextMiddleware, upStreamActive, }) {
    return {
      nextMiddleware: function invokeMap (val, order) {
        if (upStreamActive.call()) {
          return nextMiddleware(mapper(val), order);
        }
      },
    };
  };
}

function parallel () {
  return function createParallel ({ nextMiddleware, upStreamActive, resolve, }) {
    let futures = [];
    return {
      resolve: async function resolveParallel () {
        const copy = futures.slice();
        futures = [];
        await Promise.all(copy.map(task => task()));
        await resolve();
      },
      nextMiddleware: function invokeParallel (val, order) {
        if (upStreamActive.call()) {
          futures.push(() => nextMiddleware(val, order));
          return true;
        }
      },
    };
  };
}

function pick (keys) {
  const keySet = createSet(keys);
  return function createPick ({ nextMiddleware, upStreamActive, }) {
    return {
      nextMiddleware: function invokePick (val, order) {
        if (upStreamActive.call()) {
          val = Object.entries(val)
            .filter(e => keySet[e[0]])
            .reduce(entriesToObject, {});
          return nextMiddleware(val, order);
        }
      },
    };
  };
}

function distinctBy (picker) {
  return function createDistinctBy ({ resolve, nextMiddleware, upStreamActive, }) {
    let history = {};
    return {
      resolve: async function resolveDistinctBy () {
        history = {};
        await resolve();
      },
      nextMiddleware: function invokeDistinctBy (val, order) {
        if (upStreamActive.call()) {
          const key = picker(val);
          if (!history[key]) {
            history[key] = true;
            return nextMiddleware(val, order);
          }
          return true;
        }
      },
    };
  };
}
function distinct () {
  return function createDistinct ({ resolve, nextMiddleware, upStreamActive, }) {
    let history = {};
    return {
      resolve: async function resolveDistinct () {
        history = {};
        await resolve();
      },
      nextMiddleware: function invokeDistinct (val, order) {
        if (upStreamActive.call()) {
          if (!history[val]) {
            history[val] = true;
            return nextMiddleware(val, order);
          }
          return true;
        }
      },
    };
  };
}

function filter (predicate) {
  return function createFilter ({ upStreamActive, nextMiddleware, }) {
    return {
      nextMiddleware: function invokeFilter (val, order) {
        if (upStreamActive.call()) {
          if (predicate(val)) {
            return nextMiddleware(val, order);
          }
          return true;
        }
      },
    };
  };
}

function reject (predicate) {
  return function createReject ({ upStreamActive, nextMiddleware, }) {
    return {
      nextMiddleware: function invokeReject (val, order) {
        if (upStreamActive.call()) {
          if (!predicate(val)) {
            return nextMiddleware(val, order);
          }
          return true;
        }
      },
    };
  };
}

function omit (keys) {
  const rejectables = new Set(keys);
  return function createOmit ({ upStreamActive, nextMiddleware, }) {
    return {
      nextMiddleware: function invokeOmit (val, order) {
        if (upStreamActive.call()) {
          val = Object.entries(val).filter(e => !rejectables.has(e[0])).reduce(entriesToObject, {});

          return nextMiddleware(val, order);
        }
      },
    };
  };
}

function where (matcher) {
  const matchEntries = Object.entries(matcher);
  return function createWhere ({ upStreamActive, nextMiddleware,  }) {
    return {
      nextMiddleware: function invokeWhere (val, order) {
        if (upStreamActive.call()) {
          for (const e of matchEntries) {
            if (val[e[0]] !== e[1]) {
              return true;
            }
          }
          return nextMiddleware(val, order);
        }
      },
    };
  };
}

function skipWhile (predicate) {
  return function createSkipWhile ({ resolve, upStreamActive, nextMiddleware, }) {
    let take = false;
    return {
      resolve: function resolveSkipWhile () {
        take = false;
        return resolve();
      },
      nextMiddleware: function invokeSkipWhile (val, order) {
        if (upStreamActive.call()) {
          if (take || (take = !predicate(val))) {
            return nextMiddleware(val, order);
          }
          return true;
        }
      },
    };
  };
}

function scan (scanner, acc) {
  return function createScan ({ resolve, upStreamActive, nextMiddleware, }) {
    let output = acc;
    let futures = [];
    return {
      resolve: function resolveScan () {
        output = acc;
        futures = [];
        return resolve();
      },
      nextMiddleware: async function invokeScan (val, order) {
        if (upStreamActive.call()) {
          futures.push(async (input) => {
            const result = scanner(input, val);
            output = result;
            return nextMiddleware(result, order);
          });
          if (futures.length===1) {
            for (let i = 0; i<futures.length; i++) {
              if (!await futures[i](output)) {
                return false;
              }
            }
            futures = [];
            return true;
          }
        }
      },
    };
  };
}

function takeUntil (predicate) {
  return function createTakeUntil ({ resolve, upStreamActive, nextMiddleware, }) {
    let take = true;
    return {
      resolve: function resolveTakeUntil () {
        take=true;
        return resolve();
      },
      upStreamActive: upStreamActive.concat(() => take),
      nextMiddleware: function invokeTakeUntil (val, order) {
        if (upStreamActive.call() && take && (take = !predicate(val))) {
          return nextMiddleware(val, order);
        }
      },
    };
  };
}

function takeWhile (predicate) {
  return function createTakeWhile ({ resolve, upStreamActive, nextMiddleware, }) {
    let take = true;
    return {
      resolve: function resolveTakeWhile () {
        take = true;
        return resolve();
      },
      upStreamActive: upStreamActive.concat(() => take),
      nextMiddleware: function invokeTakeWhile (val, order) {
        if (take && (take = predicate(val)) && upStreamActive.call()) {
          return nextMiddleware(val, order);
        }
      },
    };
  };
}

function skip (count) {
  count = Number(count) || 0;
  return function createSkip ({ upStreamActive, nextMiddleware, }) {
    let total = 0;
    return {
      nextMiddleware: function invokeSkip (val, order) {
        if (upStreamActive.call()) {
          if (total>=count) {
            return nextMiddleware(val, order);
          } else {
            total++;
            return true;
          }
        }
      },
    };
  };
}
function take (max) {
  return function createTake ({ resolve, upStreamActive, nextMiddleware, }) {
    max = Number(max) || 0;
    let taken = 0;
    return {
      upStreamActive: upStreamActive.concat(() => taken < max),
      resolve: function resolveTake () {
        taken = 0;
        return resolve();
      },
      nextMiddleware: function invokeTake (val, order) {
        if (taken < max && upStreamActive.call()) {
          taken++;
          return nextMiddleware(val, order);
        }
      },
    };
  };
}

function sum () {
  return function createSum ({ nextMiddleware, upStreamActive, resolve, }) {
    let total = 0;
    return {
      resolve: async function resolveSum () {
        const result = total;
        total = 0;
        await nextMiddleware(result, [ 0, ]);
        await resolve();
      },
      nextMiddleware: function invokeSum (val) {
        if (upStreamActive.call()) {
          total +=val;
          return true;
        }
      },
    };
  };
}

function reduce (reducer, acc) {
  return function createReduce ({ nextMiddleware, upStreamActive, resolve, }) {
    let output = acc;
    return {
      resolve: async function resolveReduce () {
        const result = output;
        output = acc;
        await nextMiddleware(result, [ 0, ]);
        await resolve();
      },
      nextMiddleware: function invokeReduce (val) {
        if (upStreamActive.call()) {
          output = reducer(output, val);
          return true;
        }
      },
    };
  };
}

function some (predicate) {
  return function createSome ({ nextMiddleware, upStreamActive, resolve, }) {
    let output = false;
    upStreamActive = upStreamActive.concat(() => !output);
    return {
      upStreamActive,
      resolve: async function resolveSome () {
        const result = output;
        output = false;
        await nextMiddleware(result, [ 0, ]);
        await resolve();
      },
      nextMiddleware: function invokeSome (val) {
        if (upStreamActive.call()) {
          return !!(output = predicate(val));
        }
      },
    };
  };
}

function every (predicate) {
  return function createEvery ({ nextMiddleware, upStreamActive, resolve,  }) {
    let output = true;
    upStreamActive = upStreamActive.concat(() => output);
    return {
      upStreamActive,
      resolve: async function resolveEvery () {
        const result = output;
        output = true;
        await nextMiddleware(result, [ 0, ]);
        return resolve();
      },
      nextMiddleware: function invokeEvery (val) {
        if (upStreamActive.call()) {
          return output = !!predicate(val);
        }
      },
    };
  };
}

function await$ (mapper) {
  return function createAwait$ ({ nextMiddleware, upStreamActive, }) {
    return {
      nextMiddleware: async function invokeAwait$ (val, order) {
        if (upStreamActive.call()) {
          await nextMiddleware(await mapper(val), order);
          return upStreamActive.call();
        }
      },
    };
  };
}
module.exports = {
  first,
  entries,
  values,
  keys,
  reverse,
  sort,
  peek,
  toArray,
  toObject,
  toObjectSet,
  parallel,
  ordered,
  some,
  every,
  toSet,
  toMap,
  flatten,
  map,
  pick,
  distinct,
  distinctBy,
  filter,
  reject,
  omit,
  where,
  skipWhile,
  scan,
  takeWhile,
  takeUntil,
  skip,
  take,
  sum,
  reduce,
  default: default$,
  await: await$,
};