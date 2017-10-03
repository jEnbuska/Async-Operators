import And from '../src/CompositeAnd';

describe('CompositePredicates', () => {
  test('single predicate', function () {
    const pred = And();
    expect(pred.call()).toBeTruthy();
  });

  test('push predicate', function(){
    const pred = And();
    expect(pred.call()).toEqual(true)
    pred.push(() => true)
    expect(pred.call()).toEqual(true)
    pred.push(() => false)
    expect(pred.call()).toEqual(false)
    pred.push(() => true)
    expect(pred.call()).toEqual(false)
  });

  test('concat predicate', function () {
    const pred = And();
    const pred2 = pred.concat(() => true);
    expect(pred !== pred2).toBeTruthy();
  });

  test('concat predicate return true', function () {
    const pred0 = And(() => true);
    expect(pred0.call()).toBe(true);
    const pred1 = pred0.concat(() => true);
    expect(pred1.call()).toBe(true);
    const pred2 = pred1.concat(() => true);
    expect(pred2.call()).toBe(true);
  });

  test('concat predicate return false', function () {
    const pred00 = And(() => false);
    expect(pred00.call()).toBe(false)
    const pred0 = And().concat(() => false);
    expect(pred0.call()).toBe(false);
    const pred1 = And().concat(() => false).concat(() => true).concat(() => true);
    expect(pred1.call()).toBe(false);
    const pred2 = And().concat(() => true).concat(() => true).concat(() => false);
    expect(pred2.call()).toBe(false);
    const pred3 = And().concat(() => true).concat(() => false).concat(() => true);
    expect(pred3.call()).toBe(false);
  });
});
