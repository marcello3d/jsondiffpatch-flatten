import {
  AddDelta,
  AnyDelta,
  ArrayDelta,
  ArrayMoveDelta,
  DeleteDelta,
  ObjectDelta,
  ReplaceDelta,
  UnidiffDelta,
} from './jsondiffpatch-types';

export type AddDeltaType = {
  type: 'add';
  delta: AddDelta;
  newValue: unknown;
};
export type ReplaceDeltaType = {
  type: 'replace';
  delta: ReplaceDelta;
  oldValue: unknown;
  newValue: unknown;
};
export type DeleteDeltaType = {
  type: 'delete';
  delta: DeleteDelta;
  oldValue: unknown;
};
export type UnidiffDeltaType = {
  type: 'unidiff';
  delta: UnidiffDelta;
  unidiff: string;
};
export type ObjectDeltaType = { type: 'object'; delta: ObjectDelta };
export type ArrayDeltaType = { type: 'array'; delta: ArrayDelta };
export type ModifyDeltaType =
  | ArrayDeltaType
  | ObjectDeltaType
  | ReplaceDeltaType
  | UnidiffDeltaType;
export type MoveDeltaType = {
  type: 'array-move';
  delta: ArrayMoveDelta;
  newIndex: number;
};
export type DeltaType =
  | AddDeltaType
  | ReplaceDeltaType
  | DeleteDeltaType
  | UnidiffDeltaType
  | ObjectDeltaType
  | MoveDeltaType
  | ArrayDeltaType;

export function getDeltaType(delta: AnyDelta): DeltaType {
  if (Array.isArray(delta)) {
    if ((delta.length as number) === 0 || delta.length > 3) {
      throw new Error('invalid delta');
    }
    if (delta.length === 1) {
      return {
        type: 'add',
        delta,
        newValue: delta[0],
      };
    }
    if (delta.length === 2) {
      return {
        type: 'replace',
        delta,
        oldValue: delta[0],
        newValue: delta[1],
      };
    }
    switch (delta[2]) {
      case 0:
        return {
          type: 'delete',
          delta,
          oldValue: delta[0],
        };
      case 2:
        return {
          type: 'unidiff',
          delta,
          unidiff: delta[0],
        };
      case 3:
        return {
          type: 'array-move',
          delta,
          newIndex: delta[1],
        };
      default:
        throw new Error('invalid delta');
    }
  }
  if (delta._t === 'a') {
    return { type: 'array', delta: delta as ArrayDelta };
  }
  return { type: 'object', delta: delta as ObjectDelta };
}
