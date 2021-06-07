import type { ObjectDeltaType } from './deltaTypes';
import { DiffPatcher } from 'jsondiffpatch';
import { isArrayMove } from './jsondiffpatch-types';
import type { ObjectDelta } from './jsondiffpatch-types';
import { flattenDeltas } from './flattenDeltas';

export function flattenObjectDeltas(
  t1: ObjectDeltaType,
  t2: ObjectDeltaType,
  jdp: DiffPatcher,
  verifyEquality: ((a: unknown, b: unknown) => void) | undefined,
): ObjectDelta | undefined {
  const obj: ObjectDelta = { ...t1.delta };
  for (const key of Object.keys(t2.delta)) {
    const result = flattenDeltas(obj[key], t2.delta[key], jdp, verifyEquality);
    if (result === undefined) {
      delete obj[key];
    } else {
      if (isArrayMove(result)) {
        throw new Error('unexpected array move in object diff');
      }
      obj[key] = result;
    }
  }
  return Object.keys(obj).length > 0 ? obj : undefined;
}
