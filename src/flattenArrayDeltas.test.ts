import { flattenDeltas } from './flattenDeltas';
import { Delta } from './jsondiffpatch-types';
import {
  crashOnNotEqual,
  jdp,
  makeFuzzTests,
  testDiffPatch,
} from './testLib/testDiffPatch';

describe('merges deltas', () => {
  const tests: [Delta | undefined, Delta | undefined, Delta | undefined][] = [
    [
      // [ 0, 3 ],
      // [ 0, 2, 3 ],
      // [ 0, 1, 2, 3 ],
      { '1': [2], _t: 'a' } as Delta,
      { '1': [1], _t: 'a' } as Delta,
      { '1': [1], '2': [2], _t: 'a' } as Delta,
    ],
    [
      // [ 0, 3 ],
      // [ 0, 1, 3 ],
      // [ 0, 1, 2, 3 ],
      { '1': [1], _t: 'a' } as Delta,
      { '2': [2], _t: 'a' } as Delta,
      { '1': [1], '2': [2], _t: 'a' } as Delta,
    ],
    [
      // [ 0, 3 ],
      // [ 0, 2, 3 ],
      // [ 0, 3 ],
      { '1': [2], _t: 'a' } as Delta,
      { _1: [2, 0, 0], _t: 'a' } as Delta,
      undefined,
    ],
    [
      // [ 0, 3 ],
      // [ 0, 2, 3 ],
      // [ 0, 2 ],
      { '1': [2], _t: 'a' } as Delta,
      { _2: [3, 0, 0], _t: 'a' } as Delta,
      { '1': [2], _1: [3, 0, 0], _t: 'a' } as Delta,
    ],
    [
      // [ 1, 3 ],
      // [ 3 ],
      // [ 0, 3 ],
      { _0: [1, 0, 0], _t: 'a' } as Delta,
      { '0': [0], _t: 'a' } as Delta,
      { '0': [0], _0: [1, 0, 0], _t: 'a' } as Delta,
    ],
    [
      // [ 0, 1, 2, 3 ],
      // [ 0, 2, 3 ],
      // [ 0, 3 ],
      { _1: [1, 0, 0], _t: 'a' } as Delta,
      { _1: [2, 0, 0], _t: 'a' } as Delta,
      { _1: [1, 0, 0], _2: [2, 0, 0], _t: 'a' } as Delta,
    ],
    [
      // [ 1, 3 ],
      // [ 1, 2, 3 ],
      // [ 1, 2, 4 ],
      { '1': [2], _t: 'a' } as Delta,
      { '2': [4], _t: 'a', _2: [3, 0, 0] },
      { '1': [2], '2': [4], _t: 'a', _1: [3, 0, 0] } as Delta,
    ],
    [
      // [ 1, 3 ],
      // [ 1, 2, 3, 4 ],
      // [ 1, 2, 3, 4, 5 ],
      { '1': [2], '3': [4], _t: 'a' } as Delta,
      { '4': [5], _t: 'a' },
      { '1': [2], '3': [4], '4': [5], _t: 'a' } as Delta,
    ],
    [
      // a: [ 1, 3 ],
      // b: [ 1, 2, 3, 4, 5 ],
      // c: [ 1, 3, 4, 5 ],
      { '1': [2], '3': [4], '4': [5], _t: 'a' } as Delta,
      { _t: 'a', _1: [2, 0, 0] },
      { _t: 'a', '2': [4], '3': [5] } as Delta,
    ],
  ];

  it.each(tests)('flattenDeltas(%s, %s) => %s', (a, b, r) => {
    const result = flattenDeltas(a, b, jdp, crashOnNotEqual);
    try {
      expect(result).toEqual(r);
    } catch (e) {
      console.warn({ a, b, expected: r, result });
      throw e;
    }
  });

  const fuzzTests = makeFuzzTests([
    [1, 2, 3, 4],
    [1, 2, 3, 4, 5],
    [1, 3, 4, 5],
    [1, 3, 4],
    [1, 3],
    [1, 2, 3],
    [1, 4, 2, 3],
    undefined,
  ]);

  it.each(fuzzTests)('fuzzed testDiffPatch(%s, %s, %s) ', testDiffPatch);
});
