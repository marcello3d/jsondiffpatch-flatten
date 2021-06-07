import { DeleteDeltaType, DeltaType } from './deltaTypes';
import { DiffPatcher } from 'jsondiffpatch';
import { deleteDelta } from './jsondiffpatch-types';

export function flattenAnyDelete(
  t1: DeltaType,
  t2: DeleteDeltaType,
  jdp: DiffPatcher,
) {
  const oldValue = jdp.unpatch(jdp.clone(t2.oldValue), t1.delta);
  return deleteDelta(oldValue);
}
