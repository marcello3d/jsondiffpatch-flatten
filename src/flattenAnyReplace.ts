import { DeltaType, ReplaceDeltaType } from './deltaTypes';
import { DiffPatcher } from 'jsondiffpatch';

export function flattenAnyReplace(
  t1: DeltaType,
  t2: ReplaceDeltaType,
  jdp: DiffPatcher,
) {
  const oldValue = jdp.unpatch(jdp.clone(t2.oldValue), t1.delta);
  return jdp.diff(oldValue, t2.newValue);
}
