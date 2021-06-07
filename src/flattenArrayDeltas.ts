import { DiffPatcher } from 'jsondiffpatch';
import { flattenDeltas } from './flattenDeltas';
import { AnyDelta, ArrayDelta, arrayMove } from './jsondiffpatch-types';
import {
  AddDeltaType,
  ArrayDeltaType,
  DeleteDeltaType,
  getDeltaType,
  ModifyDeltaType,
  MoveDeltaType,
} from './deltaTypes';
import { flattenAnyDelete } from './flattenAnyDelete';

type ArrayDeleteDeltaType = DeleteDeltaType & {
  oldIndex: number;
  cancel: boolean;
};
type ArrayMoveDeltaType = MoveDeltaType & {
  oldIndex: number;
  cancel: boolean;
};
type ArrayAddDeltaType = AddDeltaType & {
  newIndex: number;
  cancel: boolean;
};
type ArrayModifyDeltaType = ModifyDeltaType & {
  newIndex: number;
  cancel: boolean;
};

function parseArrayDelta(delta: ArrayDelta): {
  toRemove: (ArrayDeleteDeltaType | ArrayMoveDeltaType)[];
  toInsert: (ArrayAddDeltaType | ArrayMoveDeltaType)[];
  toModify: ArrayModifyDeltaType[];
} {
  const toRemove: (ArrayDeleteDeltaType | ArrayMoveDeltaType)[] = [];
  const toInsert: (ArrayAddDeltaType | ArrayMoveDeltaType)[] = [];
  const toModify: ArrayModifyDeltaType[] = [];
  for (const key of Object.keys(delta)) {
    if (key !== '_t') {
      const dt = getDeltaType(delta[key] as AnyDelta);
      if (key[0] === '_') {
        const oldIndex = parseInt(key.slice(1), 10);
        switch (dt.type) {
          case 'delete':
            toRemove.push({ ...dt, oldIndex, cancel: false });
            break;
          case 'array-move':
            const move = { ...dt, oldIndex, cancel: false };
            toRemove.push(move);
            toInsert.push(move);
            break;
          default:
            throw new Error(`unexpected ${dt.type} in array[${key}]`);
        }
      } else {
        const newIndex = parseInt(key, 10);
        switch (dt.type) {
          case 'add':
            toInsert.push({ ...dt, newIndex, cancel: false });
            break;
          case 'replace':
          case 'unidiff':
          case 'object':
          case 'array':
            toModify.push({ ...dt, newIndex, cancel: false });
            break;
          default:
            throw new Error(`unexpected ${dt.type} in array[${key}]`);
        }
      }
    }
  }
  toRemove.sort((a, b) => a.oldIndex - b.oldIndex);
  toInsert.sort((a, b) => a.newIndex - b.newIndex);
  return { toRemove, toInsert, toModify };
}

export function flattenArrayDeltas(
  t1: ArrayDeltaType,
  t2: ArrayDeltaType,
  jdp: DiffPatcher,
  verifyEquality: ((a: unknown, b: unknown) => void) | undefined,
): ArrayDelta | undefined {
  // number: refers to the index in the final (right) state of the array, this is used to indicate items inserted.
  // underscore + number: refers to the index in the original (left) state of the array, this is used to indicate items removed, or moved.

  // The way array diffs work in jsondiffpatch:
  // 1. the array fields are split into three lists:
  //    a. `_<num>` (delete/moves) is put into a toRemove list
  //    b. `<num>` with an add delta is put into a toInsert list
  //    c. `<num>` with a modify delta is put into a toModify list
  // 2. the toRemove list is sorted by index
  // 3. items are removed in reverse order from the array
  //    a. any move items are added to the toInsert list
  // 4. the toInsert list is sorted by index
  // 5. items are inserted into the array
  // 6. finally, the toModify list is applied to the final array

  // So in summary:
  //   1. removes and the removal part of a moves are run first
  //   2. inserts are applied second
  //   3. modifies last

  // To combine two deltas we need to simulate running this twice

  const array1 = parseArrayDelta(t1.delta);
  const array2 = parseArrayDelta(t2.delta);

  // console.log('BEFORE array1', array1, 'array2', array2);

  for (const remove2 of array2.toRemove) {
    if (remove2.type !== 'array-move') {
      for (const modify1 of array1.toModify) {
        if (modify1.newIndex === remove2.oldIndex) {
          if (remove2.type === 'delete') {
            modify1.cancel = true;
            remove2.delta = flattenAnyDelete(modify1, remove2, jdp);
          }
        }
      }
    }
    for (const insert1 of array1.toInsert) {
      if (insert1.newIndex === remove2.oldIndex) {
        // delete both insert and remove
        insert1.cancel = true;
        remove2.cancel = true;
      }
    }
  }
  // if we have { 2: modify(A) } + { _0: remove(B) } we need: { _0: remove(B), 1: modify(A) }
  //   so if delta 2 has a remove, decrease delta 1 ≤X modifies by 1
  for (const remove2 of array2.toRemove) {
    for (const modify1 of array1.toModify) {
      if (modify1.newIndex > remove2.oldIndex) {
        modify1.newIndex--;
      }
    }
    for (const insert1 of array1.toInsert) {
      // if we have { 1: add(A) } + { _2: remove(B) } we need: { 1: add(A), _1: remove(B) }
      //   so if delta 1 has an add, we need to decrease delta2 ≥X removes by 1

      // if we have { 2: add(A) } + { _0: remove(B) } we need: { _0: remove(B), 1: add(A) }
      //   so if delta 2 has a remove, decrease delta 1 ≤X adds by 1
      if (insert1.newIndex > remove2.oldIndex) {
        insert1.newIndex--;
      } else if (insert1.newIndex < remove2.oldIndex) {
        remove2.oldIndex--;
      }
    }
  }

  // if we have { 2: add(A) } + { 2: add(B) } we need: { 2: add(B), 3: add(A) }
  //   so if delta 2 has an add, increase delta1 ≥X index by 1
  // if we have { 2: modify(A) } + { 1: add(B) } we need: { 1: add(B), 3: modify(A) }
  //   so if delta 2 has an add, increase delta1 ≥X index by 1
  for (const insert2 of array2.toInsert) {
    for (const insert1 of array1.toInsert) {
      if (insert1.newIndex >= insert2.newIndex) {
        insert1.newIndex++;
      }
    }
    for (const modify1 of array1.toModify) {
      if (modify1.newIndex >= insert2.newIndex) {
        modify1.newIndex++;
      }
    }
  }

  // if we have { _2: remove(A) } + { _2: remove(B) } we need: { _2: remove(A), _3: remove(B) }
  //   so if delta 1 has an remove, we need to increase delta2 ≥X removes by 1
  // if we have { _0: remove(A) } + { 0: add(B) } we need: { _0: remove(A), 0: add(B) }
  //   so if delta 1 has an remove, we don't need to do anything to adds
  for (const remove1 of array1.toRemove) {
    for (const remove2 of array2.toRemove) {
      if (remove2.oldIndex >= remove1.oldIndex) {
        remove2.oldIndex++;
      }
    }
  }
  // if we have { 1: add(A) } + { _1: remove(B) } we need: {}
  //   so if delta 1 has an add and delta 2 has delete at same index, cancel them out (plus other rules below)
  // if we have { 1: modify(A,B) } + { _1: remove(B) } we need: { remove(A) }
  //   so if delta 1 has an modify and delta 2 has delete at same index, delete wins (plus other rules below)
  // if we have { 1: add(A) } + { 1: modify(B) } we need: { 1: add(B) }
  //   so if delta 1 has an add and delta 2 has modify at same index, combine
  // if we have { 1: modify(A) } + { 1: modify(B) } we need: { 1: add(B) }
  //   so if delta 1 has an modify and delta 2 has modify at same index, combine

  const obj: ArrayDelta = { _t: 'a' };

  for (const insert1 of array1.toInsert) {
    if (insert1.type !== 'array-move' && !insert1.cancel) {
      obj[insert1.newIndex] = insert1.delta;
    }
  }
  for (const modify1 of array1.toModify) {
    if (!modify1.cancel) {
      obj[modify1.newIndex] = modify1.delta;
    }
  }
  for (const remove1 of array1.toRemove) {
    if (!remove1.cancel) {
      obj['_' + remove1.oldIndex] =
        remove1.type === 'array-move'
          ? arrayMove(remove1.newIndex)
          : remove1.delta;
    }
  }

  for (const insert2 of array2.toInsert) {
    if (insert2.type !== 'array-move' && !insert2.cancel) {
      if (obj[insert2.newIndex]) {
        throw new Error('double add');
      }
      obj[insert2.newIndex] = insert2.delta;
    }
  }
  for (const modify2 of array2.toModify) {
    if (!modify2.cancel) {
      const result = flattenDeltas(
        obj[modify2.newIndex],
        modify2.delta,
        jdp,
        verifyEquality,
      );
      if (result) {
        obj[modify2.newIndex] = result;
      } else {
        delete obj[modify2.newIndex];
      }
    }
  }
  for (const remove2 of array2.toRemove) {
    if (!remove2.cancel) {
      const key = '_' + remove2.oldIndex;
      const result = flattenDeltas(
        obj[key] as AnyDelta,
        remove2.type === 'array-move'
          ? arrayMove(remove2.newIndex)
          : remove2.delta,
        jdp,
        verifyEquality,
      );
      if (result) {
        obj[key] = result;
      } else {
        delete obj[key];
      }
    }
  }

  if (Object.keys(obj).length === 1) {
    return undefined;
  }
  return obj;
}
