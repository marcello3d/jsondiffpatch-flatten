import { DeltaType } from './deltaTypes';

export function invalidCombo(t1: DeltaType, t2: DeltaType) {
  return new Error(`invalid combo: ${t1.type}, ${t2.type}`);
}
