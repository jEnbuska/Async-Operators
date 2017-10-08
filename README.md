Enables chaining async operations

##Required Node 8 >=
```
const { parallel, ordered } require('async_operators');

function sleep(ms, result){
  return new Promise(resolve => 
    setTimeout(() => 
      resolve(result), 
      ms
    ))
}

async function parallelMapDistinctFilter(){
  const pipe = parallel()
    .map(val => sleep(val, val))
    .await()
    .distinct()
    .map(it => it*2)
    .filter(it => it !== 8)
    .toArray();

  const result = await pipe.invoke(5, 4, 3, 2, 1, 2, 3, 4, 5);
  expect(result).toEqual([ 2, 4, 6, 10, ]);
  const result2 = await pipe.invoke(4, 3, 2, 1);
  expect(result2).toEqual([ 2, 4, 6, ]);
}

async function flattenWithLimit(){
  const pipe = ordered()
    .flatten() // optionally flattener can be passed as callback
    .take(2); // stops all downstreams operations when limit is hit
    .toArray()
  const names = await pipe.invoke({ firstname: 'John', lastname: 'Doe', });

  expect(names).toEqual([ 'John', 'Doe', ]);

  const firstTwoNumbers = await pipe.invoke([ 1, ],  [ 2, 3, ], [ 4, 5, 6, ]);
  expect(firstTwoNumbers).toEqual([ 1, 2, ]);       
}

async function parallelAwaitFlattenParallelAwaitFlatten(){
   const result = await parallel()
     .await() // [ 8 ,1 ], [ 1, 2 ]
     .flatten() // 8, 1, 1, 2
     .map(val => sleep(val*10, [ val, val*2, ]))
     .parallel()
     .await() // [ 1, 2 ], [ 1, 2 ] [ 2, 4 ] [ 8, 16 ]
     .flatten()// 1, 2, 1, 2, 2, 4, 8, 16
     .toArray()
     .invoke(sleep(100, [ 1, 2, ]), sleep(50, [ 8, 1, ]));
   expect(result).toEqual([ 1, 2, 1, 2, 2, 4, 8, 16, ]);
}
```
###### more examples under tests/operators.test.js

#### parallel tasks

Use 'parallel' between every await if tasks should be awaited simultaneously 
```...
     .parallel()
     .await()
     ...
     .parallel()
     ...
     await()
```

Order of values is not ensured after await()

Use sort(comparator) or ordered() after await / await + parallel , if the order of results is relevant

#### initializers
parallel()

ordered()

#### finalizers
invoke(...list)

range(from, to) //exclusive

#### operators

filter(string | callback)

reject(string | callback)

where(object)

map(...strings | callback)

scan(callback, seed)

reduce(callback, seed)

toArray()

toObject(string | callback)

toObjectSet(string | callback)

toSet(string | callback)

toMap(string | callback)

sum()

pick(...strings)

omit(...strings)

distinct()

distinctBy(string | callback)

some(string | callback)

every(string | callback)

flatten(undefined | callback)

keys()  _same as  .flatten(Object.keys)_

values() _same as .flatten(Object.values)_

entries() _same as .flatten(Object.entries)_

first()

take(number)

takeWhile(string | callback)

takeUntil(string | callback)

skipWhile(string | callback)

await()

parallel()

ordered()

reverse()

sort(undefined | callback)

default(any) // default value