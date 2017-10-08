import And from '../src/CompositeAnd';

describe('CompositeAnd', () => {
  test('single and', function () {
    const pred = new And();
    expect(pred.call()).toBeTruthy();
  });

  test('concat and', function () {
    const pred = new And();
    const pred2 = pred.concat(() => true);
    expect(pred !== pred2).toBeTruthy();
  });

  test('concat and return true', function () {
    const pred0 = new And(() => true);
    expect(pred0.call()).toBe(true);
    const pred1 = pred0.concat(() => true);
    expect(pred1.call()).toBe(true);
    const pred2 = pred1.concat(() => true);
    expect(pred2.call()).toBe(true);
  });

  test('concat and return false', function () {
    const pred00 = new And(() => false);
    expect(pred00.call()).toBe(false);
    const pred0 = new And().concat(() => false);
    expect(pred0.call()).toBe(false);
    const pred1 = new And().concat(() => false).concat(() => true).concat(() => true);
    expect(pred1.call()).toBe(false);
    const pred2 = new And().concat(() => true).concat(() => true).concat(() => false);
    expect(pred2.call()).toBe(false);
    const pred3 = new And().concat(() => true).concat(() => false).concat(() => true);
    expect(pred3.call()).toBe(false);
  });
});
