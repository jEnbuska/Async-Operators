/* eslint-disable semi */
import lazy from '../src';
import { peek, } from '../src/middlewareCreators';

async function sleep (time, result) {
  return new Promise(res => setTimeout(() => {
    res(result);
  }, time));
}

const { keys, } = Object;
describe('lazy', async () => {

  test('share simple', async () => {
    const result0 = await lazy()
      .parallel()
      .awaitResolved()
      .map(it => it*2)
      .share()
      .reduce()
      .push(
        sleep(10, 5),       // 2 ->  10
        sleep(15, 3),       // 3 ->  6
        sleep(25, 10),    // 5 ->  20 -> skip
        sleep(20, 5),     // 4 ->   10
        sleep(5, 1),         // 1 ->  2
        sleep(25, 30)   // 6 -> 60 -> end)
      );
    expect(result0).toEqual([ 2, 10, 6, 10, 20, 60, ]);
  });

  test('share push', async() => {
    const instance = lazy()
      .parallel()
      .awaitResolved()
      .map(it =>  it*2)
      .share();
    const pulled = [];
    await instance
      .filter(it => it <15)
      .pull({
        onNext (val) {
          pulled.push(val);
        },
      });
    const sumOutput = await instance
      .sum()
      .push(
        sleep(10, 5),       // 2 ->  10
        sleep(15, 3),       // 3 ->  6
        sleep(25, 10),    // 5 ->  20 -> skip
        sleep(20, 5),     // 4 ->   10
        sleep(5, 1),         // 1 ->  2
        sleep(25, 30)   // 6 -> 60 -> skip
      );
    expect(pulled).toEqual([ 2, 10, 6, 10, ]);
    expect(sumOutput).toBe(2*(5+3+10+5+1+30));
  });

  test('linear share', async () => {
    const peeks= { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], };
    const instance = lazy()
      .peek(it => peeks[1].push(it))
      .takeUntil(it => it===8)
      .share()
      .peek(it => peeks[2].push(it))
      .takeUntil(it => it===7)
      .share()
      .peek(it => peeks[3].push(it))
      .takeUntil(it => it===6)
      .share()
      .peek(it => peeks[4].push(it))
      .takeUntil(it => it===5)
      .share()
      .peek(it => peeks[5].push(it))
      .takeUntil(it => it===4)
      .share()
      .peek(it => peeks[6].push(it))
      .takeUntil(it => it===3)
      .share()
      .peek(it => peeks[7].push(it))
      .share()
    const unpull1 = instance.pull();
    await instance.propose(1);
    expect(peeks).toEqual({ 1: [ 1, ], 2: [ 1, ], 3: [ 1, ], 4: [ 1, ], 5: [ 1, ], 6: [ 1, ], 7: [ 1, ], })
    unpull1();
    const unpull2 = instance.pull();
    const unpull3 = instance.pull();
    await instance.propose(2);
    expect(peeks).toEqual({ 1: [ 1, 2, ], 2: [ 1, 2, ], 3: [ 1, 2, ], 4: [ 1, 2, ], 5: [ 1, 2, ], 6: [ 1, 2, ], 7: [ 1, 2, ], })
    await instance.propose(3);
    const final = { 1: [ 1, 2, 3, ], 2: [ 1, 2, 3, ], 3: [ 1, 2, 3, ], 4: [ 1, 2, 3, ], 5: [ 1, 2, 3, ], 6: [ 1, 2, 3, ], 7: [ 1, 2, ], };
    await instance.propose(4);
    unpull2();
    unpull3();
    expect(peeks).toEqual(final);
    const unpull4 = instance.pull();
    await instance.propose(1)
    unpull4()
    expect(peeks).toEqual(final);
    const unpull5 = instance.pull();
    await instance.propose(2)
    expect(peeks).toEqual(final);
    await instance.propose(1);
    expect(peeks).toEqual(final);
  });

  test('branch share with linear retirement', async () => {
    const peeks= { root: [], a: [], a_a: [], a_b: [], b: [], b_a: [], b_b: [], a_a_a: [], b_a_a: [], };
    function createPush (key) {
      return function (val) {
        peeks[key].push(val)
      }
    }
    const root = lazy()
      .peek(createPush('root'))
      .takeUntil(it =>  it === 8)
      .share();
    const branch_A = root
      .takeUntil(it =>  it === 7)
      .peek(createPush('a'))
      .share();
    const branch_A_A = branch_A
      .takeUntil(it =>  it === 6)
      .peek(createPush('a_a'))
      .share()
    const branch_A_B = branch_A
      .takeUntil(it =>  it === 5)
      .peek(createPush('a_b'))
      .share();

    const branch_B = root
      .takeUntil(it =>  it === 4)
      .peek(createPush('b'))
      .share();

    const branch_B_A = branch_B
      .takeUntil(it =>  it === 3)
      .peek(createPush('b_a'))
      .share();

    const branch_B_B = branch_B
      .takeUntil(it =>  it === 2)
      .peek(createPush('b_b'))
      .share()

    const branch_A_A_A = branch_A_A
      .takeUntil(it =>  it === 1)
      .peek(createPush('a_a_a'))
      .share();
    const branch_B_A_A = branch_B_B
      .takeUntil(it =>  it === 0)
      .peek(createPush('b_a_a'))
      .share();

    const observations = [
      root.pull(),
      branch_A.pull(),
      branch_B.pull(),
      branch_A_A.pull(),
      branch_A_B.pull(),
      branch_B_A.pull(),
      branch_B_B.pull(),
      branch_A_A_A.pull(),
      branch_B_A_A.pull(),
    ]

    const peeksExpected = keys(peeks).reduce((acc, k) => ({ ...acc, [k]: [ -1, ], }), {});
    await root.propose(-1);
    expect(peeks).toEqual(peeksExpected);
    const excluded = [ 'b_a_a', ];
    keys(peeksExpected).filter(k => excluded.every(key => k !== key)).forEach(k => peeksExpected[k].push(0));
    await root.propose(0);
    excluded.push('a_a_a');
    keys(peeksExpected).filter(k => excluded.every(key => k !== key)).forEach(k => peeksExpected[k].push(1));
    await root.propose(1);
    expect(peeks).toEqual(peeksExpected);
    excluded.push('b_b');
    keys(peeksExpected).filter(k => excluded.every(key => k !== key)).forEach(k => peeksExpected[k].push(2));
    await root.propose(2);
    expect(peeks).toEqual(peeksExpected);
    excluded.push('b_a');
    keys(peeksExpected).filter(k => excluded.every(key => k !== key)).forEach(k => peeksExpected[k].push(3));
    await root.propose(3);
    expect(peeks).toEqual(peeksExpected);
    excluded.push('b');
    keys(peeksExpected).filter(k => excluded.every(key => k !== key)).forEach(k => peeksExpected[k].push(4));
    await root.propose(4);
    expect(peeks).toEqual(peeksExpected);

    excluded.push('a_b');
    keys(peeksExpected).filter(k => excluded.every(key => k !== key)).forEach(k => peeksExpected[k].push(5));
    await root.propose(5);
    expect(peeks).toEqual(peeksExpected);

    excluded.push('a_a');
    keys(peeksExpected).filter(k => excluded.every(key => k !== key)).forEach(k => peeksExpected[k].push(6));
    await root.propose(6);
    expect(peeks).toEqual(peeksExpected);

    excluded.push('a');
    keys(peeksExpected).filter(k => excluded.every(key => k !== key)).forEach(k => peeksExpected[k].push(7));
    await root.propose(7);
    expect(peeks).toEqual(peeksExpected);

    keys(peeksExpected).filter(k => excluded.every(key => k !== key)).forEach(k => peeksExpected[k].push(8));
    await root.propose(8);
    expect(peeks).toEqual(peeksExpected);

    excluded.push('root');
    await root.propose(1);
    expect(peeks).toEqual(peeksExpected)
    const branches = [ root, branch_A, branch_A_A, branch_A_B, branch_B, branch_B_A, branch_B_B, branch_A_A_A, branch_B_A_A, ]
    for (const branch of branches) {
      await branch.propose(-1)
    }
    expect(peeks).toEqual(peeksExpected)

    const newObservations = branches.map(branch => branch.pull());
    for (const branch of branches) {
      await branch.propose(-1)
    }
    newObservations.forEach(obs => obs())
    observations.forEach(obs => obs());
    expect(peeks).toEqual(peeksExpected);

    for (const branch of branches) {
      await branch.propose(-1)
    }
    branches.forEach(b => b.pull());
    for (const branch of branches) {
      await branch.propose(-1)
    }
    expect(peeks).toEqual(peeksExpected);
  });

  test('share branch with reversed retirement', async () => {
    const peeks= { root: [], a: [], a_a: [], a_b: [], b: [], b_a: [], b_b: [], a_a_a: [], b_a_a: [], };
    function createPush (key) {
      return function (val) {
        peeks[key].push(val)
      }
    }
    const root = lazy()
      .peek(createPush('root'))
      .takeUntil(it =>  it === 1)
      .share();
    const branch_A = root
      .takeUntil(it =>  it === 2)
      .peek(createPush('a'))
      .share();
    const branch_A_A = branch_A
      .takeUntil(it =>  it === 3)
      .peek(createPush('a_a'))
      .share()
    const branch_A_B = branch_A
      .takeUntil(it =>  it === 4)
      .peek(createPush('a_b'))
      .share();

    const branch_B = root
      .takeUntil(it =>  it === 5)
      .peek(createPush('b'))
      .share();

    const branch_B_A = branch_B
      .takeUntil(it =>  it === 6)
      .peek(createPush('b_a'))
      .share();

    const branch_B_B = branch_B
      .takeUntil(it =>  it === 7)
      .peek(createPush('b_b'))
      .share()

    const branch_A_A_A = branch_A_A
      .takeUntil(it =>  it === 8)
      .peek(createPush('a_a_a'))
      .share();
    const branch_B_A_A = branch_B_B
      .takeUntil(it =>  it === 9)
      .peek(createPush('b_a_a'))
      .share();
    const observations = [
      root.pull({onComplete(){console.log('ROOT_ON_COMPLETE')}}),
      branch_A.pull(),
      branch_B.pull(),
      branch_A_A.pull(),
      branch_A_B.pull(),
      branch_B_A.pull(),
      branch_B_B.pull(),
      branch_A_A_A.pull(),
      branch_B_A_A.pull({onNext: (val) =>console.log(val), onComplete(){console.log('ON_COMPLETE')}}),
    ]

    const peeksExpected = keys(peeks).reduce((acc, k) => ({ ...acc, [k]: [ 0, ], }), {});
    const retired = [];
    await root.propose(0);
    expect(peeks).toEqual(peeksExpected);
    peeksExpected.root.push(1);
    await root.propose(1);
    retired.push('root');
    expect(peeks).toEqual(peeksExpected);
    await root.propose(1);
    expect(peeks).toEqual(peeksExpected);
    console.log('propose A');
    await branch_A.propose(1);
    console.log('propose B')
    await branch_B.propose(1);
    keys(peeksExpected).filter(k => retired.some(key => k !== key)).forEach(k => peeksExpected[k].push(1));
    expect(peeks).toEqual(peeksExpected)
  });

  test('share multiple times', async () => {
    const rootPeeks = [];
    const root = lazy()
      .parallel()
      .awaitResolved()
      .peek(it => rootPeeks.push(it))
      .map(it => it*2)
      .share();

    const branch1Peeks = [];
    const branch1Peeks2 = [];
    const pull1Results = [];
    let observation1Completed = false;
    const observation1 = root
      .peek(it => branch1Peeks.push(it))
      .takeUntil(it => it===10)
      .peek(it => branch1Peeks2.push(it))
      .pull({
        onNext (val) {
          pull1Results.push(val)
        },
        onComplete () {
          observation1Completed = true;
        },
      });

    const branch2Peeks = [];
    const branch = root
      .skip(1)
      .peek(it => branch2Peeks.push(it))
      .take(5)
      .scan((acc = [], it) => [ ...acc, it, ], [])
      .share();

    const branch2ChildPeeks = [];
    const pull2Results = [];
    let observation2Completed = false;
    const observation2 = branch
      .peek(it => branch2ChildPeeks.push(it))
      .take(4)
      .pull({
        onNext (val) {
          pull2Results.push(val);
        },
        onComplete () {
          observation2Completed = true
        },
      });

    await root.propose(sleep(10, 10), sleep(50, 5), sleep(20, 20), sleep(60, 60), sleep(100, 100), sleep(80, 80));
    expect(observation1Completed).toBeTruthy();
    expect(observation2Completed).toBeTruthy();
    expect(branch1Peeks).toEqual([ 20, 40, 10, ]);
    expect(branch1Peeks2).toEqual([ 20, 40, ]);
    expect(branch2Peeks).toEqual([ 40, 10, 120, 160, ]);
    expect(rootPeeks).toEqual([ 10, 20, 5, 60, 80, ]);
    expect(pull1Results).toEqual([ 20, 40, ]);
    expect(pull2Results).toEqual([ [ 40, ], [ 40, 10, ], [ 40, 10, 120, ], [ 40, 10, 120, 160, ], ])

    const observation3 = branch.pull();
    await root.propose(1);

    expect(branch1Peeks).toEqual([ 20, 40, 10, ]);
    expect(branch1Peeks2).toEqual([ 20, 40, ]);
    expect(branch2Peeks).toEqual([ 40, 10, 120, 160, ]);
    expect(rootPeeks).toEqual([ 10, 20, 5, 60, 80, 1, ]);
    expect(pull1Results).toEqual([ 20, 40, ]);
    expect(pull2Results).toEqual([ [ 40, ], [ 40, 10, ], [ 40, 10, 120, ], [ 40, 10, 120, 160, ], ])

    observation3();
    const observation4 = branch.pull();
    await root.propose(2);
    expect(branch1Peeks).toEqual([ 20, 40, 10, ]);
    expect(branch1Peeks2).toEqual([ 20, 40, ]);
    expect(branch2Peeks).toEqual([ 40, 10, 120, 160, ]);
    expect(rootPeeks).toEqual([ 10, 20, 5, 60, 80, 1, 2, ]);
    expect(pull1Results).toEqual([ 20, 40, ]);
    expect(pull2Results).toEqual([ [ 40, ], [ 40, 10, ], [ 40, 10, 120, ], [ 40, 10, 120, 160, ], ])

    observation4();
    await root.propose(3);
    expect(branch1Peeks).toEqual([ 20, 40, 10, ]);
    expect(branch1Peeks2).toEqual([ 20, 40, ]);
    expect(branch2Peeks).toEqual([ 40, 10, 120, 160, ]);
    expect(rootPeeks).toEqual([ 10, 20, 5, 60, 80, 1, 2, 3, ]);
    expect(pull1Results).toEqual([ 20, 40, ]);
    expect(pull2Results).toEqual([ [ 40, ], [ 40, 10, ], [ 40, 10, 120, ], [ 40, 10, 120, 160, ], ])
  })

  test('share re-use', async() => {
    const instance = lazy()
      .parallel()
      .awaitResolved()
      .map(it =>  it*2)
      .takeUntil(it => it>=50)
      .share();
    const result = await instance
      .filter(it => it <15)
      .reduce()
      .push(
        sleep(10, 5),       // 2 ->  10
        sleep(15, 3),       // 3 ->  6
        sleep(25, 10),    // 5 ->  20 -> skip
        sleep(20, 5),     // 4 ->   10
        sleep(5, 1),         // 1 ->  2
        sleep(25, 30)   // 6 -> 60 -> end
      );
    expect(result).toEqual([ 2, 10, 6, 10, ]);
    const result2 = await instance
      .reduce((acc, next) => [ ...acc, next, ], [])
      .push(
        sleep(10, 5),
        sleep(15, 3),
        sleep(25, 10),
        sleep(20, 5),
        sleep(5, 1),
        sleep(25, 30)
      );
    expect(result2).toEqual([]);
  });

});
