Performs asynchronous operations using
familiar functions like 'map', 'filter', 'reduce' etc..
######0 external dependencies

####Required Node 7 >=
 
<b>examples at the bottom of the page</b>
###### more examples under tests/operators.test.js
```npm install --save async_operators```



## Initializers:
```
const { parallel, ordered, from } = require('lazy_operators');
await parallel(?number).map(...).filter(...).resolve(...) ...
await ordered().map(...).filter(...).resolve(...) ...

async function fetchProductsOneByOne(onNext){
      const productIds = await fetch('/content');
      await Promise.all(productIds.map(id => fetch('/content/' + id).then(onNext));
      onNext('DONE') 
}

const products = await from(fetchProductsOneByOne)
    .takeUntil(next => next === 'DONE')
    .map(...)
    .filter(...)
    .resolve();
```
###### parallel(); is simply a shorthand for ordered().parallel();
###### from(...) expects a callback function expects to be invoked possible multiple times. Flow control filters are a must when using 'from'.

## resolvers:
```
.resolve(...listOfParams);
.range(from, to); //exlusive
```
* Note that invoking operator with single value does not necessarily need a reducing operator:
```
const agedJohn = await ordered()
  .map(john => ({...john, age: john.age+1}))
  .resolve({ name: 'John', age: 25 });
console.log(agedJohn); // { name: 'John', age: 26, }
```

## reducing operators:
```
.toArray()
.reduce(callback, acc)
.groupBy(...strings)
.toObject(string | callback)
.toObjectSet(string | callback)
.toSet(string | callback)
.toMap(string | callback)
.sum()
.some(string | callback)
.every(string | callback)
.first()
.min(comparator)
.max(comparator)
```
#####Note that reducing operators can be continued:

```await ordered().sum().map(sum => sum*2).resolve(1,2,3); // --> 12 ```
```groupBy can take multiple arguments. The more arguments are given, more structured the end result will be
await ordered()
  .groupBy('gender', 'age')
  .resolve({gender: 0, age: 25, name: 'Tim'}) //--> { 0, { 25: [{gender: 0, age: 25, name: 'Tim' }] } }
```

## filtering operators:
```
.filter(string | callback)
.reject(string | callback)
.where(object) 
```
#####Explanations
```
.filter(/*without parameters*/)
  same as --> filter(val => !!val)
.filter('name')
  same as --> filter(val => !!val.name)
  
.reject(...)// is opposite of filter

.where({name: 'John', age: 25}) 
  same as --> filter(({age, name}) => age===25 && name: 'John')
```
### mapping operators:
```
.map(string | callback)
.scan(callback, seed)
.pick(...strings)
.omit(...strings)
```
#####Explanations
```
.map(callback); //same as [...].map(callback)
.map('name');// same as [...].map(it => it.name)

.scan((acc, next) => ({...acc, [next.id]: next}),{/*seed*})
  //same as [...].reduce(..., {}), but it publishes all intermediate values

.pick('name','age')
  //same as --> .map(it => ({name: it.name, age: it.age}))

.omit(...) // negate of pick
```

## flatMappers:
```
.keys()  //same as  .flatten(Object.keys)
.values() //same as .flatten(Object.values)
.entries() //same as .flatten(Object.entries)
.flatten(undefined | callback)
```
#####Explanations
default flattener for 'flatten' is Object.values
## flow control filters:
```
.take(number)
.takeWhile(string | callback)
.takeUntil(string | callback)
.skip(number)
.skipWhile(string | callback)
.distinct()
.distinctBy(string | callback)
```
#####Explanations
State of these flow control middlewares have their internal state. This internal state is not shared between different resolves
```
const pipe = parallel().take(1);
const [ a, b, ]= await Promise.all([ pipe.resolve(1), pipe.resolve(2), ]);
console.log({ a, b, }); // { a: 1, b: 2 }
```
middlewares 'take(), takeWhile, takeUntil() & first()' 
stops all other ongoing operations downstream when their goal is hit
## Ordering
```
.parallel()
.ordered()
.reverse()
.sort(undefined | callback | object)
```
#####Explanations
* middlewares 'ordered, reverse, and sort', are blocking the upstream execution until all downstream operations are finished
* parallel execution stops being parallel on 'ordered,  reverse, sort' middlewares.
* parallel execution is not recursively parallel by default:
* sort without param or with callback sorts the values as expected
* sort with object parameter expect an object with shape of: 
   ```{propName1: 'DESC', propName2: 'ASC'}```

```
parallel() // --> parallel
 .await()
 .flatten()// --> not recursively parallel
 .map(async (val) => {/*map something async*/})
 .parallel() // --> parallel
 .await()
 .resolve(/*some parallel tasks*/) 
```
## other:
```
await(callback)
default(any)
```
#####Explanations
```
const result = await ordered()
  .filter(it => it!==1)
  .default('NOT_SET')
  .resolve(1)
console.log(result); // 'NOT_SET'

.await(?mapper)
  // waits until promise is resolved
```

## parallel tasks
* Order of values is not ensured after await()
* Use sort(comparator) or ordered() after await / await + parallel , if the order of results is relevant

## examples
```
const { parallel, ordered } require('async_operators');

//util function for examples
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

  // The order might vary
  const result = await pipe.resolve(5, 4, 3, 2, 1, 2, 3, 4, 5);
  expect(result).toEqual([ 2, 4, 6, 10, ]);
  const result2 = await pipe.resolve(4, 3, 2, 1);
  expect(result2).toEqual([ 2, 4, 6, ]);
}

async function flattenWithLimit(){
  const pipe = ordered()
    .flatten() // optionally flattener can be passed as callback
    .take(2); // stops all downstreams operations when limit is hit
    .toArray()
  const names = await pipe.resolve({ firstname: 'John', lastname: 'Doe', });

  expect(names).toEqual([ 'John', 'Doe', ]);

  const firstTwoNumbers = await pipe.resolve([ 1, ],  [ 2, 3, ], [ 4, 5, 6, ]);
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
     .resolve(sleep(100, [ 1, 2, ]), sleep(50, [ 8, 1, ]));
   expect(result).toEqual([ 1, 2, 1, 2, 2, 4, 8, 16, ]);
}
```
