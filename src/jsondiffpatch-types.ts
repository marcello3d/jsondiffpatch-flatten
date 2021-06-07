export type AddDelta = [unknown];
export type ReplaceDelta = [unknown, unknown];
export type DeleteDelta = [unknown, 0, 0];
export type UnidiffDelta = [string, 0, 2];
export type ArrayMoveDelta = ['', number, 3];
export type ValueDelta = AddDelta | ReplaceDelta | DeleteDelta | UnidiffDelta;
export type NestedDelta = ArrayDelta | ObjectDelta;
export type ArrayDelta = {
  [index: number]: AnyDelta;
  [index: string]: AnyDelta | 'a'; // ugh
  _t: 'a';
};
export type ObjectDelta = {
  [key: string]: Delta;
};
export type Delta = ValueDelta | NestedDelta;
export type AnyDelta = ValueDelta | NestedDelta | ArrayMoveDelta;

export function addDelta(newValue: unknown): AddDelta {
  return [newValue];
}

export function replaceDelta(
  oldValue: unknown,
  newValue: unknown,
): ReplaceDelta {
  return [oldValue, newValue];
}

export function deleteDelta(oldValue: unknown): DeleteDelta {
  return [oldValue, 0, 0];
}

export function unidiffDelta(unidiff: string): UnidiffDelta {
  return [unidiff, 0, 2];
}

export function arrayMove(destinationIndex: number): ArrayMoveDelta {
  return ['', destinationIndex, 3];
}

export function isArrayMove(delta: AnyDelta): delta is ArrayMoveDelta {
  return delta[2] === 3;
}
