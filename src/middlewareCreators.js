/* eslint-disable consistent-return */
const { NOT_SET, createSet, orderComparator, entriesToObject, } = require('./utils');

function keep (callback) {
  return function createKeep ({ active, next, }) {
    return {
      next: function invokeKeep (val, keep, order) {
        if (active.call()) {
          return next(val, { ...keep, ...callback(val, keep), }, order);
        }
      },
    };
  };
}

function first () {
  return function createFirst ({ resolve, active, next, }) {
    let value = NOT_SET;
    active = active.concat(() => value === NOT_SET);
    return {
      active,
      resolve: async function resolveFirst () {
        const { val, keep = {}, }= value;
        value = NOT_SET;
        await next(val, keep, [ 0, ]);
        await resolve();
      },
      next: function invokeFirst (val, keep) {
        if (active.call()) {
          value = { val, keep, };
        }
      },
    };
  };
}

function default$ (defaultValue) {
  return function createDefault ({ next, resolve, active, }) {
    let isSet = false;
    return {
      resolve: async function resolveDefault () {
        if (!isSet) {
          await next(defaultValue, {});
        } else {
          isSet = false;
        }
        await resolve();
      },
      next: function invokeDefault (val, keep, order) {
        if (active.call()) {
          isSet = true;
          return next(val, keep, order);
        }
      },
    };
  };
}

function reverse () {
  return function createReverse ({ next, active, resolve, }) {
    let futures = [];
    return {
      resolve: async function resolveReversed () {
        const runnables = futures.reverse();
        futures = [];
        // eslint-disable-next-line no-empty
        for (let i = 0; i < runnables.length && await runnables[i](); i++) {}
        await resolve();
      },
      next: function invokeReverse (val, keep, order) {
        if (active.call()) {
          futures.push(() => next(val, keep, order));
          return true;
        }
      },
    };
  };
}

function sort (comparator) {
  return function createSort ({ next, active, resolve, }) {
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
      next: function invokeReverse (val, keep, order) {
        if (active.call()) {
          futures.push({ val, task: () => next(val, keep, order), });
          return true;
        }
      },
    };
  };
}

function peek (callback) {
  return function createPeek ({ active, next, }) {
    return {
      next: function invokePeek (val, keep, order) {
        if (active.call()) {
          callback(val, keep);
          return next(val, keep, order);
        }
      },
    };
  };
}

function toArray () {
  return function createToArray ({ active, next, resolve, }) {
    let acc = [];
    return {
      resolve: async function resolveToArray () {
        const result = acc;
        acc = [];
        await next(result, {}, [ 0, ]);
        await resolve();
      },
      next: function invokeToArray (val) {
        if (active.call()) {
          acc.push(val);
          return true;
        }
      },
    };
  };
}

function toSet (picker) {
  return function createToArray ({ active, next, resolve, }) {
    let acc = new Set();
    return {
      resolve: async function resolveToSet () {
        let result = acc;
        acc = new Set();
        await next(result, {}, [ 0, ]);
        await resolve();
      },
      next: function invokeToSet (val, keep) {
        if (active.call()) {
          acc.add(picker(val, keep));
          return true;
        }
      },
    };
  };
}

function toObject (picker) {
  return function createToObject ({ active, next, resolve, }) {
    let acc = {};
    return {
      resolve: async function resolveToObject () {
        const result = acc;
        acc = {};
        await next(result, {}, [ 0, ]);
        await resolve();
      },
      next: function invokeToObject (val, keep) {
        if (active.call()) {
          acc[picker(val, keep)] = val;
          return true;
        }
      },
    };
  };
}

function toObjectSet (picker) {
  return function createToArray ({ active, next, resolve, }) {
    let acc = {};
    return {
      resolve: async function resolveToObjectSet () {
        let result = acc;
        acc = {};
        await next(result, {}, [ 0, ]);
        await resolve();
      },
      next: function invokeToObjectSet (val, keep) {
        if (active.call()) {
          acc[picker(val, keep)] = true;
          return true;
        }
      },
    };
  };
}
function toMap (picker) {
  return function createToMap ({ active, next, resolve, }) {
    let acc = new Map();
    return {
      resolve: async function resolveToMap () {
        const result = acc;
        acc = new Map();
        await next(result, {}, [ 0, ]);
        await resolve();
      },
      next: function invokeToObject (val, keep) {
        if (active.call()) {
          acc.set(picker(val, keep), val);
          return true;
        }
      },
    };
  };
}

function ordered () {
  return function createOrdered ({ next, active, resolve, }) {
    let futures = {};
    return {
      resolve: async function resolveOrdered () {
        const runnables = Object.entries(futures).sort((e1, e2) => orderComparator(e1[0], e2[0])).map((e) => e[1]);
        futures = {};
        // eslint-disable-next-line no-empty
        for (let i = 0; i < runnables.length && await runnables[i](); i++) {}
        await resolve();
      },
      next: function invokeOrdered (val, keep, order) {
        if (active.call()) {
          futures[order] = () => next(val, keep, order);
          return true;
        }
      },
    };
  };
}

function flatten (iterator) {
  return function createFlatten ({ next, active, }) {
    return {
      next: async function invokeFlatten (val, keep, order) {
        if (active.call()) {
          const iterable = iterator(val, keep);
          for (let i = 0; i<iterable.length; i++) {
            const flattenResult = await next(iterable[i], keep, [ ...order, i, ]);
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
  return function createMap ({ next, active, }) {
    return {
      next: function invokeMap (val, keep, order) {
        if (active.call()) {
          return next(mapper(val, keep), keep, order);
        }
      },
    };
  };
}

function parallel () {
  return function createParallel ({ next, active, resolve, }) {
    let futures = [];
    return {
      resolve: async function resolveParallel () {
        const copy = futures.slice();
        futures = [];
        await Promise.all(copy);
        await resolve();
      },
      next: function invokeParallel (val, keep, order) {
        if (active.call()) {
          futures.push(next(val, keep, order));
          return true;
        }
      },
    };
  };
}

function pick (keys) {
  const keySet = createSet(keys);
  return function createPick ({ next, active, }) {
    return {
      next: function invokePick (val, keep, order) {
        if (active.call()) {
          val = Object.entries(val)
            .filter(e => keySet[e[0]])
            .reduce(entriesToObject, {});
          return next(val, keep, order);
        }
      },
    };
  };
}

function distinctBy (picker) {
  return function createDistinctBy ({ resolve, next, active, }) {
    let history = {};
    return {
      resolve: async function resolveDistinctBy () {
        history = {};
        await resolve();
      },
      next: function invokeDistinctBy (val, keep, order) {
        if (active.call()) {
          const key = picker(val, keep);
          if (!history[key]) {
            history[key] = true;
            return next(val, keep, order);
          }
          return true;
        }
      },
    };
  };
}
function distinct () {
  return function createDistinct ({ resolve, next, active, }) {
    let history = {};
    return {
      resolve: async function resolveDistinct () {
        history = {};
        await resolve();
      },
      next: function invokeDistinct (val, keep, order) {
        if (active.call()) {
          if (!history[val]) {
            history[val] = true;
            return next(val, keep, order);
          }
          return true;
        }
      },
    };
  };
}

function filter (predicate) {
  return function createFilter ({ active, next, }) {
    return {
      next: function invokeFilter (val, keep, order) {
        if (active.call()) {
          if (predicate(val, keep)) {
            return next(val, keep, order);
          }
          return true;
        }
      },
    };
  };
}

function reject (predicate) {
  return function createReject ({ active, next, }) {
    return {
      next: function invokeReject (val, keep, order) {
        if (active.call()) {
          if (!predicate(val, keep)) {
            return next(val, keep, order);
          }
          return true;
        }
      },
    };
  };
}

function omit (keys) {
  const rejectables = new Set(keys);
  return function createOmit ({ active, next, }) {
    return {
      next: function invokeOmit (val, keep, order) {
        if (active.call()) {
          val = Object.entries(val).filter(e => !rejectables.has(e[0])).reduce(entriesToObject, {});
          return next(val, keep, order);
        }
      },
    };
  };
}

function where (matcher) {
  const matchEntries = Object.entries(matcher);
  return function createWhere ({ active, next,  }) {
    return {
      next: function invokeWhere (val, keep, order) {
        if (active.call()) {
          for (const e of matchEntries) {
            if (val[e[0]] !== e[1]) {
              return true;
            }
          }
          return next(val, keep, order);
        }
      },
    };
  };
}

function skipWhile (predicate) {
  return function createSkipWhile ({ resolve, active, next, }) {
    let take = false;
    return {
      resolve: function resolveSkipWhile () {
        take = false;
        return resolve();
      },
      next: function invokeSkipWhile (val, keep, order) {
        if (active.call()) {
          if (take || (take = !predicate(val, keep))) {
            return next(val, keep, order);
          }
          return true;
        }
      },
    };
  };
}

function scan (scanner, acc) {
  return function createScan ({ resolve, active, next, }) {
    let output = acc;
    let futures = [];
    return {
      resolve: function resolveScan () {
        output = acc;
        futures = [];
        return resolve();
      },
      next: async function invokeScan (val, keep, order) {
        if (active.call()) {
          futures.push(async (input) => {
            const result = scanner(input, val, keep);
            output = result;
            return next(result, keep, order);
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
  return function createTakeUntil ({ resolve, active, next, }) {
    let take = true;
    return {
      resolve: function resolveTakeUntil () {
        take=true;
        return resolve();
      },
      active: active.concat(() => take),
      next: function invokeTakeUntil (val, keep, order) {
        if (active.call() && take && (take = !predicate(val, keep))) {
          return next(val, keep, order);
        }
      },
    };
  };
}

function takeWhile (predicate) {
  return function createTakeWhile ({ resolve, active, next, }) {
    let take = true;
    return {
      resolve: function resolveTakeWhile () {
        take = true;
        return resolve();
      },
      active: active.concat(() => take),
      next: function invokeTakeWhile (val, keep, order) {
        if (take && (take = predicate(val, keep)) && active.call()) {
          return next(val, keep, order);
        }
      },
    };
  };
}

function skip (count) {
  count = Number(count) || 0;
  return function createSkip ({ active, next, }) {
    let total = 0;
    return {
      next: function invokeSkip (val, keep, order) {
        if (active.call()) {
          if (total>=count) {
            return next(val, keep, order);
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
  return function createTake ({ resolve, active, next, }) {
    max = Number(max) || 0;
    let taken = 0;
    return {
      active: active.concat(() => taken < max),
      resolve: function resolveTake () {
        taken = 0;
        return resolve();
      },
      next: function invokeTake (val, keep, order) {
        if (taken < max && active.call()) {
          taken++;
          return next(val, keep, order);
        }
      },
    };
  };
}

function sum (summer) {
  return function createSum ({ next, active, resolve, }) {
    let total = 0;
    return {
      resolve: async function resolveSum () {
        const result = total;
        total = 0;
        await next(result, {}, [ 0, ]);
        await resolve();
      },
      next: function invokeSum (val, keep) {
        if (active.call()) {
          total += summer(val, keep);
          return true;
        }
      },
    };
  };
}

function reduce (reducer, acc) {
  return function createReduce ({ next, active, resolve, }) {
    let output = acc;
    return {
      resolve: async function resolveReduce () {
        const result = output;
        output = acc;
        await next(result, {}, [ 0, ]);
        await resolve();
      },
      next: function invokeReduce (val, keep) {
        if (active.call()) {
          output = reducer(output, val, keep);
          return true;
        }
      },
    };
  };
}

function some (predicate) {
  return function createSome ({ next, active, resolve, }) {
    let output = false;
    active = active.concat(() => !output);
    return {
      active,
      resolve: async function resolveSome () {
        const result = output;
        output = false;
        await next(result, {}, [ 0, ]);
        await resolve();
      },
      next: function invokeSome (val, keep) {
        if (active.call()) {
          return !!(output = predicate(val, keep));
        }
      },
    };
  };
}

function every (predicate) {
  return function createEvery ({ next, active, resolve,  }) {
    let output = true;
    active = active.concat(() => output);
    return {
      active,
      resolve: async function resolveEvery () {
        const result = output;
        output = true;
        await next(result, {}, [ 0, ]);
        return resolve();
      },
      next: function invokeEvery (val, keep) {
        if (active.call()) {
          return output = !!predicate(val, keep);
        }
      },
    };
  };
}

function await$ (mapper) {
  return function createAwait$ ({ next, active, }) {
    return {
      next: async function invokeAwait$ (val, keep, order) {
        if (active.call()) {
          await next(await mapper(val, keep), keep, order);
          return active.call();
        }
      },
    };
  };
}

function min (comparator) {
  return function createMin ({ next, active, resolve, }) {
    let min = NOT_SET;
    return {
      resolve: async function resolveMin () {
        if (min!==NOT_SET) {
          await next(min, {},  [ 0, ]);
        }
        await resolve();
      },
      next: function invokeMin (val, keep) {
        if (active.call()) {
          if (min!==NOT_SET) {
            if (comparator(min, val, keep) > 0) {
              min = val;
            }
          } else {
            min = val;
          }
          return true;
        }
      },
    };
  };
}

function max (comparator) {
  return function createMin ({ next, active, resolve, }) {
    let max = NOT_SET;
    return {
      resolve: async function resolveMax () {
        if (min!==NOT_SET) {
          await next(max, {}, [ 0, ]);
        }
        await resolve();
      },
      next: function invokeMax (val, keep) {
        if (active.call()) {
          if (max!==NOT_SET) {
            if (comparator(max, val, keep) < 0) {
              max = val;
            }
          } else {
            max= val;
          }
          return true;
        }
      },
    };
  };
}

function groupBy (callback) {
  return function createGroupBy ({ next, active, resolve, }) {
    let groups = {};
    return {
      resolve: async function resolveGroupBy () {
        const result = { ...groups, };
        groups = {};
        await next(result, {}, [ 0, ]);
        await resolve();
      },
      next: function invokeGroupBy (val, keep) {
        if (active.call()) {
          const group = callback(val, keep);
          if (!groups[group]) {
            groups[group] = [];
          }
          groups[group].push(val);
          return true;
        }
      },
    };
  };
}

module.exports = {
  keep,
  groupBy,
  first,
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
  min,
  max,
  default: default$,
  await: await$,
};