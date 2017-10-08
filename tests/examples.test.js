const { ordered, parallel, } = require('../');
const { sleep, } = require('./common');

describe('examples', async () => {
  test('parallel map and filter', async () => {
    const pipe = parallel()
      .await()
      .map(it => it*2)
      .filter(it => it !== 20)
      .toArray();

    const result = await pipe.invoke(sleep(10, 10), sleep(5, 5), sleep(15, 15));
    expect(result).toEqual([ 10, 30, ]);
    const result2 = await pipe.invoke(sleep(3, 3), sleep(2, 2), sleep(1, 1));
    expect(result2).toEqual([ 2, 4, 6, ]);
  });

  test('flatten with limit example', async () => {
    const pipe = ordered()
      .flatten() // optionally flattener can be passed as callback
      .take(2); // stops all downstreams operations when limit is hit

    const names = await  pipe
      .toArray()
      .invoke({ firstname: 'John', lastname: 'Doe', });

    expect(names).toEqual([ 'John', 'Doe', ]);

    const firstTwoNumbers = await pipe
      .toArray()
      .invoke([ 1, ],  [ 2, 3, ], [ 4, 5, 6, ]);
    expect(firstTwoNumbers).toEqual([ 1, 2, ]);
  });

  test('parallel await flatten parallel await flatten', async () => {
    const result = await parallel()
      .await() // [ 7 ,1 ], [ 1, 2 ]
      .flatten() // 7, 1, 1, 2
      .map(val => sleep(val*10, [ val, val*2, ]))
      .parallel()
      .await() // [ 1, 2 ], [ 1, 2 ] [ 2, 4 ] [ 6, 18 ]
      .flatten()// 1, 2, 1, 2, 2, 4, 6, 18
      .toArray()
      .invoke(sleep(100, [ 1, 2, ]), sleep(50, [ 8, 1, ]));
    expect(result).toEqual([ 1, 2, 1, 2, 2, 4, 8, 16, ]);
  });
});

