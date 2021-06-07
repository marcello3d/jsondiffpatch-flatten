import type { DiffPatcher } from 'jsondiffpatch';
import { flattenUnidiffs } from './flattenUnidiffs';
import { flattenArrayDeltas } from './flattenArrayDeltas';
import {
  addDelta,
  AnyDelta,
  deleteDelta,
  unidiffDelta,
} from './jsondiffpatch-types';
import { DeltaType, getDeltaType } from './deltaTypes';
import { flattenObjectDeltas } from './flattenObjectDeltas';
import { flattenAnyReplace } from './flattenAnyReplace';
import { flattenAnyDelete } from './flattenAnyDelete';
import { invalidCombo } from './invalidCombo';

export function flattenDeltas(
  d1: AnyDelta | undefined,
  d2: AnyDelta | undefined,
  jdp: DiffPatcher,
  verifyEquality?: (a: unknown, b: unknown) => void,
): AnyDelta | undefined {
  if (!d1) {
    return d2;
  }
  if (!d2) {
    return d1;
  }
  return flattenDeltaTypes(
    getDeltaType(d1),
    getDeltaType(d2),
    jdp,
    verifyEquality,
  );
}
function flattenDeltaTypes(
  t1: DeltaType,
  t2: DeltaType,
  jdp: DiffPatcher,
  verifyEquality?: (a: unknown, b: unknown) => void,
): AnyDelta | undefined {
  if ('newValue' in t1 && 'oldValue' in t2) {
    verifyEquality?.(t1.newValue, t2.oldValue);
  }

  switch (t1.type) {
    case 'add':
      switch (t2.type) {
        case 'add':
        case 'array-move':
          throw invalidCombo(t1, t2);

        case 'replace':
          return addDelta(t2.newValue);

        case 'delete':
          return undefined;

        case 'unidiff':
        case 'array':
        case 'object':
          return addDelta(jdp.patch(jdp.clone(t1.newValue), t2.delta));
      }
      break;
    case 'replace':
      switch (t2.type) {
        case 'add':
          throw invalidCombo(t1, t2);

        case 'replace':
          return jdp.diff(t1.oldValue, t2.newValue);

        case 'delete':
          return deleteDelta(t1.oldValue);

        case 'unidiff':
        case 'array-move':
        case 'array':
        case 'object':
          return jdp.diff(
            t1.oldValue,
            jdp.patch(jdp.clone(t1.newValue), t2.delta),
          );
      }
      break;
    case 'delete':
      switch (t2.type) {
        case 'add':
          return jdp.diff(t1.oldValue, t2.newValue);

        case 'replace':
        case 'delete':
        case 'unidiff':
        case 'array-move':
        case 'array':
        case 'object':
          throw invalidCombo(t1, t2);
      }
      break;
    case 'unidiff':
      switch (t2.type) {
        case 'add':
        case 'array-move':
        case 'array':
        case 'object':
          throw invalidCombo(t1, t2);

        case 'replace':
          return flattenAnyReplace(t1, t2, jdp);

        case 'delete':
          return flattenAnyDelete(t1, t2, jdp);

        case 'unidiff':
          return unidiffDelta(flattenUnidiffs(t1.unidiff, t2.unidiff));
      }
      break;
    case 'array-move':
      switch (t2.type) {
        case 'add':
          throw invalidCombo(t1, t2);

        case 'delete':
        case 'array-move':
        case 'replace':
        case 'unidiff':
        case 'array':
        case 'object':
          return t2.delta;
      }
      break;
    case 'array':
      switch (t2.type) {
        case 'add':
        case 'unidiff':
        case 'object':
        case 'array-move':
          throw invalidCombo(t1, t2);
        case 'replace':
          return flattenAnyReplace(t1, t2, jdp);
        case 'delete':
          return flattenAnyDelete(t1, t2, jdp);
        case 'array':
          return flattenArrayDeltas(t1, t2, jdp, verifyEquality);
      }
      break;
    case 'object':
      switch (t2.type) {
        case 'add':
        case 'unidiff':
        case 'array':
        case 'array-move':
          throw invalidCombo(t1, t2);
        case 'replace':
          return flattenAnyReplace(t1, t2, jdp);
        case 'delete':
          return flattenAnyDelete(t1, t2, jdp);
        case 'object':
          return flattenObjectDeltas(t1, t2, jdp, verifyEquality);
      }
      break;
  }

  throw new Error(`unimplemented combo: ${t1.type}, ${t2.type}`);
}
