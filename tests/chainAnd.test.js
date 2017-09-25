import Predicate from '../src/CompositeAnd';

describe('CompositeAnd', () => {
  test('single predicate', function () {
    const pred = Predicate();
    expect(pred.call()).toBeTruthy();
  });

  test('concat predicate', function () {
    const pred = Predicate();
    const pred2 = pred.concat(() => true);
    expect(pred !== pred2).toBeTruthy();
  });

  test('concat predicate return true', function () {
    const pred0 = Predicate(() => true);
    expect(pred0.call()).toBe(true);
    const pred1 = pred0.concat(() => true);
    expect(pred1.call()).toBe(true);
    const pred2 = pred1.concat(() => true);
    expect(pred2.call()).toBe(true);
  });

  test('concat predicate return false', function () {
    const pred00 = Predicate(() => false);
    expect(pred00.call()).toBe(false)
    const pred0 = Predicate().concat(() => false);
    expect(pred0.call()).toBe(false);
    const pred1 = Predicate().concat(() => false).concat(() => true).concat(() => true);
    expect(pred1.call()).toBe(false);
    const pred2 = Predicate().concat(() => true).concat(() => true).concat(() => false);
    expect(pred2.call()).toBe(false);
    const pred3 = Predicate().concat(() => true).concat(() => false).concat(() => true);
    expect(pred3.call()).toBe(false);
  });
});
