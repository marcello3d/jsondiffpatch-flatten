import { flattenDeltas } from './flattenDeltas';
import {
  addDelta,
  deleteDelta,
  Delta,
  replaceDelta,
  unidiffDelta,
} from './jsondiffpatch-types';
import {
  crashOnNotEqual,
  jdp,
  makeFuzzTests,
  testDiffPatch,
} from './testLib/testDiffPatch';

describe('merges deltas', () => {
  const tests: [Delta | undefined, Delta | undefined, Delta | undefined][] = [
    [
      replaceDelta('hello', 'world'),
      replaceDelta('world', 'there'),
      replaceDelta('hello', 'there'),
    ],
    [replaceDelta('hello', 'world'), undefined, replaceDelta('hello', 'world')],
    [undefined, replaceDelta('hello', 'world'), replaceDelta('hello', 'world')],
    [deleteDelta('hello'), addDelta('hello'), undefined],
    [addDelta('hello'), deleteDelta('hello'), undefined],
    [addDelta('hello'), replaceDelta('hello', 'there'), addDelta('there')],
    [
      addDelta('hello that is a darkness'),
      jdp.diff('hello that is a darkness', 'hello what is a darkness'),
      addDelta('hello what is a darkness'),
    ],
    [
      replaceDelta('hello', 'there'),
      deleteDelta('there'),
      deleteDelta('hello'),
    ],
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
  const badTests: [Delta, Delta, string][] = [
    [
      replaceDelta('hello', 'world'),
      replaceDelta('there', 'world'),
      'unexpected data mismatch',
    ],
    [[] as unknown as Delta, [0, 0, 0], 'invalid delta'],
    [[9, 9, 9] as unknown as Delta, [0, 0, 0], 'invalid delta'],
    [addDelta('hello'), addDelta('world'), 'invalid combo'],
    [deleteDelta('hello'), deleteDelta('hello'), 'invalid combo'],
    [deleteDelta('hello'), replaceDelta('hello', 'world'), 'invalid combo'],
    [replaceDelta('hello', 'world'), addDelta('hello'), 'invalid combo'],
    [unidiffDelta('hello'), addDelta('hello'), 'invalid combo'],
    [unidiffDelta('hello'), {}, 'invalid combo'],
    [unidiffDelta('hello'), { _t: 'a' }, 'invalid combo'],
    [{}, addDelta('hello'), 'invalid combo'],
    [{}, deleteDelta('hello'), 'reverse failed'],
    [{}, replaceDelta('hello', 'world'), 'reverse failed'],
    [{}, unidiffDelta('hello'), 'invalid combo'],
    [{ _t: 'a' }, addDelta('hello'), 'invalid combo'],
    [{ _t: 'a' }, deleteDelta('hello'), 'reverse failed'],
    [{ _t: 'a' }, replaceDelta('hello', 'world'), 'reverse failed'],
    [{ _t: 'a' }, unidiffDelta('hello'), 'invalid combo'],
  ];

  it.each(badTests)('flattenDeltas(%s, %s) fails with %s', (a, b, r) => {
    expect(() => flattenDeltas(a, b, jdp, crashOnNotEqual)).toThrowError(r);
  });
  it('flattenDeltas works without 4th param', () => {
    expect(
      flattenDeltas(
        replaceDelta('hello', 'world'),
        replaceDelta('there', 'world'),
        jdp,
      ),
    ).toEqual(replaceDelta('hello', 'world'));
  });

  it('catches mispatched deltas', () => {
    expect(() =>
      flattenDeltas(
        replaceDelta('a', 'b'),
        replaceDelta('c', 'a'),
        jdp,
        crashOnNotEqual,
      ),
    ).toThrowError('unexpected data mismatch');
  });

  it.each([
    ['hello', 'darkness', 'my old friend'],
    [{ a: true }, { a: true, b: 'hello' }, { a: false, b: 'hello' }],
    [{ a: true }, { a: true, b: 'hello' }, { a: false, b: 'hello' }],
    [
      [1, 2, 3, 4],
      [1, 2, 3, 4, 5],
      [1, 3, 4, 5],
    ],
    [[{ id: 1 }], [{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 1 }]],
    ['hello', 'hello darkness', 'hello that is a darkness'],
    ['hello that is a darkness', 'hello', 'hello there'],
    ['hello that is a darkness', 'hello there', 'hello'],
  ])('testDiffPatch(%s, %s, %s)', (a, b, c) => {
    testDiffPatch(a, b, c);
  });

  const fuzzTests = makeFuzzTests([
    'hello',
    'hello darkness',
    'hello that is a darkness',
    { a: true },
    { a: true, b: 'hello' },
    { a: true, b: 'hello that is a darkness' },
    { a: false, b: 'hello' },
    [1, 2, 3, 4],
    [1, 2, 3, 4, 5],
    [1, 3, 4, 5],
    undefined,
  ]);

  it.each(fuzzTests)('fuzzed testDiffPatch(%s, %s, %s) ', testDiffPatch);
});
