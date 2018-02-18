Performs asynchronous operations using
familiar functions like 'map', 'filter', 'reduce' etc..


######No external dependencies
#### Required Node 7 >=
 
```npm install async_operators```

```yarn add async_operators```

## Stream initializers:
```
const { parallel, generator } = require('lazy_operators');
await parallel(?number)... // parameter is limit of parallel executions. Defalts to unlimited
await generator(callback)... // example below
```
#####parallel example
```
const stores = await parallel()
    .await()
    .flatten()
    .map(await store => ({store, location: await fetch(`${LOCATION_API}/${store.id}`)}))
    .await()
    .filter(store => store.location)
    .resolve(fetchStores);
```
#####generator example

Generator is kind of advanced flattener that is able to run async operations and observe if upstream does not accept any more results by calling finished() 
```
async function fetchStore(onNext, onComplete, finished, value){
      const stores = await fetch(`${API_URL}/stores`);
      for(leti = 0; i<store.length && !finished(); i++){
          stores.forEach(onNext); // calls the next middleware (.map)
      }
      onComplete(); // must be invoked, or the generator will never resolve
}
const storesWithLocations = await generator(fetchStores)
    .map(async store => ({store, location: await fetch(`${LOCATION_API}/${store.id}`)}))
    .await()
    .filter(store => store.location)
    .map(toCamelCase)
    .resolve();
```
## Stream resolvers:
Calling resolver return a promise that return the result of the stream.
```
.resolve(...listOfParams); -> any
.range(from, to); -> any
.consume(); -> undefined
.forEach(callback) -> undefined
```

## Reducing operators:
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

* Note that invoking operator resulting in single value does not necessarily need a *reducing* operator:

Example below:
```
const agedJohn = await parallel()
  .map(john => ({...john, age: john.age+1}))
  .resolve({ name: 'John', age: 25 });
console.log(agedJohn); // { name: 'John', age: 26, }
```

#####Reducing operators can also be continued:
```
const twelve = await parallel().
    .sum(). // reducing operator
    .map(sum => sum*2)
    .resolve(1,2,3);  // second reducing operator
```
##### Grouping example


groupBy can take multiple arguments. The more arguments are given, the more structured the end result will be
```
const groupedPersons = await parallel()
  .groupBy('gender', 'age')
  .resolve(
    {gender: 0, age: 25, name: 'Tim'},
    {gender: 0: age: 20, name: 'John'}
) //--> { 0, { 25: [{gender: 0, age: 25, name: 'Tim' }], 20: [{gender: 0, age: 20, name: 'John}]} } }
```

## filtering operators:
```
.filter(?string | ?callback); 
.reject(string | callback)
.where(object) 
```
#####Explanations
```
.filter(/*without parameters*/) // same as --> filter(val => !!val)
.filter('name') // same as --> filter(val => !!val['name'])
.reject(...)// is opposite of filter
.where({name: 'John', age: 25})  // same as --> filter(({age, name}) => age===25 && name: 'John')
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
.map(callback); //same array map
.map('name');// same as array.map(it => it.name)

.scan((acc, next) => ({...acc, [next.id]: next}),{/*seed*})
  //same as [...].reduce(..., {}), but it publishes all intermediate values

.pick('name','age')
  //same as --> .map(person => ({name: person.name, age: person.age}))

.omit(...) // negate of pick
```

## flatMappers:
```
.keys()  //same as  .flatten(Object.keys)
.values() //same as .flatten(Object.values)
.entries() //same as .flatten(Object.entries)
.flatten(undefined | callback)
```
default flattener for 'flatten' is Object.values

## flow control filters:
```
.take(number) // takes the limit of executable tasks
.takeWhile(string | callback) // takes tasks until first task return false 
.takeUntil(string | callback) // negate of takeWhile
.skip(number) // skips the first tasks
.skipWhile(string | callback) // skips the tasks until first task return true
.distinctBy(...string) //expect one or more keys to be passed as arguments like so distinctBy('a','b','c');
.distinct() // compares the inputs by their natural value (next history) => history.every(prev => prev!==next)
```
### Flow control middlewares have their internal state. This internal state is not shared between different resolves
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
* sort with object parameter expect an object with shape of: 
   ```{keyName1: 'DESC', keyName: 'ASC'}```

```
parallel() // --> parallel
 .await()
 .flatten()// --> not recursively parallel
 .map(async (val) => {/*map something async*/})
 .parallel() // --> parallel again
 .await()
 .resolve(/*some parallel tasks*/) 
```
## await:
```
await() // waits until promise is resolved

```
## default:
```
.default(any) // emits default value on resolve if no value passes through

const result = await parallel()
  .filter(it => it!==1)
  .default('NOT_SET')
  .resolve(1)
console.log(result); // 'NOT_SET' 
```

## parallel tasks
* Order of values is not ensured after await()
* Use sort(comparator) or ordered() after await / await + parallel , if the order of results is relevant

