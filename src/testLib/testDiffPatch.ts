import { create } from 'jsondiffpatch';
import fastDeepEqual from 'fast-deep-equal';
import { flattenDeltas } from '../flattenDeltas';

export function crashOnNotEqual(a: unknown, b: unknown) {
  if (!fastDeepEqual(a, b)) {
    throw new Error('unexpected data mismatch');
  }
}

export const jdp = create({ textDiff: { minLength: 10 } });

export function testDiffPatch(a: unknown, b: unknown, c: unknown) {
  const diffAB = jdp.diff(a, b);
  const diffBC = jdp.diff(b, c);
  let diffABC;
  let result;
  try {
    diffABC = flattenDeltas(diffAB, diffBC, jdp, crashOnNotEqual);
    result = diffABC ? jdp.patch(jdp.clone(a), diffABC) : a;
    expect(result).toEqual(c);
  } catch (e) {
    console.warn({ a, b, c, diffAB, diffBC, diffABC, result });
    throw e;
  }
}

export function makeFuzzTests(
  objects: unknown[],
): [unknown, unknown, unknown][] {
  const fuzzTests: [unknown, unknown, unknown][] = [];
  for (const a of objects) {
    for (const b of objects) {
      for (const c of objects) {
        if (a !== b && b !== c) {
          fuzzTests.push([a, b, c]);
        }
      }
    }
  }
  return fuzzTests;
}
