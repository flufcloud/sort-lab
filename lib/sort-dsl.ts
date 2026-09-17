export type Scalar = string | number | boolean;
export type AlgorithmName = "bubble" | "selection" | "insertion" | "merge" | "quick" | "heap";
export type OrderValueType = "string" | "number" | "boolean";

export type SortObject = {
  id: string;
  label: string;
  data: Record<string, Scalar>;
};

export type OrderKey = {
  field: string;
  type: OrderValueType;
  direction: "asc" | "desc";
};

export type SortProgram = {
  dsl: "sort-lab/v1";
  title: string;
  objects: SortObject[];
  order: {
    keys: OrderKey[];
    tieBreak: "input";
  };
  algorithm: {
    name: AlgorithmName;
  };
};

type Operation =
  | { kind: "start" }
  | { kind: "compare"; leftId: string; rightId: string; result: -1 | 0 | 1 }
  | { kind: "swap"; left: number; right: number; itemIds: [string, string] }
  | { kind: "shift"; from: number; to: number; itemId: string }
  | { kind: "write"; index: number; itemId: string }
  | { kind: "focus"; role: "candidate" | "pivot" | "run"; itemIds: string[] }
  | { kind: "settle"; itemIds: string[] }
  | { kind: "done" };

export type TraceFrame = {
  step: number;
  state: string[];
  operation: Operation;
  comparisons: number;
  mutations: number;
  activeIds: string[];
  settledIds: string[];
};

export type ExecutionResult = {
  program: SortProgram;
  trace: TraceFrame[];
  target: string[];
  objectsById: Record<string, SortObject>;
};

export type ValidationError = { path: string; message: string };
export type ValidationResult =
  | { ok: true; program: SortProgram }
  | { ok: false; errors: ValidationError[] };

const algorithmNames: AlgorithmName[] = ["bubble", "selection", "insertion", "merge", "quick", "heap"];
const valueTypes: OrderValueType[] = ["string", "number", "boolean"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function error(errors: ValidationError[], path: string, message: string) {
  errors.push({ path, message });
}

export function validateSortProgram(value: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  if (!isRecord(value)) return { ok: false, errors: [{ path: "$", message: "Program must be an object." }] };

  if (value.dsl !== "sort-lab/v1") error(errors, "dsl", 'Expected "sort-lab/v1".');
  if (typeof value.title !== "string" || !value.title.trim()) error(errors, "title", "Title must be a non-empty string.");
  if (!Array.isArray(value.objects) || value.objects.length < 2 || value.objects.length > 64) {
    error(errors, "objects", "Provide between 2 and 64 objects.");
  }

  const ids = new Set<string>();
  if (Array.isArray(value.objects)) {
    value.objects.forEach((item, index) => {
      const path = `objects[${index}]`;
      if (!isRecord(item)) {
        error(errors, path, "Object must be a record.");
        return;
      }
      if (typeof item.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(item.id)) error(errors, `${path}.id`, "Use a non-empty ID containing letters, digits, _ or -.");
      else if (ids.has(item.id)) error(errors, `${path}.id`, `Duplicate ID "${item.id}".`);
      else ids.add(item.id);
      if (typeof item.label !== "string" || !item.label.trim()) error(errors, `${path}.label`, "Label must be a non-empty string.");
      if (!isRecord(item.data)) error(errors, `${path}.data`, "Data must be an object of scalar values.");
      else Object.entries(item.data).forEach(([field, fieldValue]) => {
        if (!field) error(errors, `${path}.data`, "Data field names cannot be empty.");
        if (!["string", "number", "boolean"].includes(typeof fieldValue) || (typeof fieldValue === "number" && !Number.isFinite(fieldValue))) {
          error(errors, `${path}.data.${field}`, "Values must be finite numbers, strings, or booleans.");
        }
      });
    });
  }

  if (!isRecord(value.order)) error(errors, "order", "Order must be an object.");
  else {
    if (value.order.tieBreak !== "input") error(errors, "order.tieBreak", 'Expected "input" so equal keys have a deterministic order.');
    if (!Array.isArray(value.order.keys) || value.order.keys.length === 0) error(errors, "order.keys", "Define at least one order key.");
    else value.order.keys.forEach((key, index) => {
      const path = `order.keys[${index}]`;
      if (!isRecord(key)) {
        error(errors, path, "Order key must be an object.");
        return;
      }
      if (typeof key.field !== "string" || !key.field) error(errors, `${path}.field`, "Field must name an object data property.");
      if (!valueTypes.includes(key.type as OrderValueType)) error(errors, `${path}.type`, "Type must be string, number, or boolean.");
      if (key.direction !== "asc" && key.direction !== "desc") error(errors, `${path}.direction`, "Direction must be asc or desc.");
      if (Array.isArray(value.objects) && typeof key.field === "string" && valueTypes.includes(key.type as OrderValueType)) {
        value.objects.forEach((item, itemIndex) => {
          if (!isRecord(item) || !isRecord(item.data)) return;
          if (!(key.field in item.data)) error(errors, `objects[${itemIndex}].data.${key.field}`, `Required by order key ${index + 1}.`);
          else if (typeof item.data[key.field] !== key.type) error(errors, `objects[${itemIndex}].data.${key.field}`, `Expected ${key.type}.`);
        });
      }
    });
  }

  if (!isRecord(value.algorithm)) error(errors, "algorithm", "Algorithm must be an object.");
  else if (!algorithmNames.includes(value.algorithm.name as AlgorithmName)) error(errors, "algorithm.name", `Choose one of: ${algorithmNames.join(", ")}.`);

  return errors.length ? { ok: false, errors } : { ok: true, program: value as SortProgram };
}

export function parseSortProgram(source: string): ValidationResult {
  try {
    return validateSortProgram(JSON.parse(source));
  } catch (cause) {
    return { ok: false, errors: [{ path: "$", message: cause instanceof Error ? cause.message : "Invalid JSON." }] };
  }
}

function scalarCompare(left: Scalar, right: Scalar) {
  if (left === right) return 0;
  if (typeof left === "boolean" && typeof right === "boolean") return left ? 1 : -1;
  return left < right ? -1 : 1;
}

function createComparator(program: SortProgram) {
  const inputRank = new Map(program.objects.map((item, index) => [item.id, index]));
  return (left: SortObject, right: SortObject): -1 | 0 | 1 => {
    for (const key of program.order.keys) {
      const result = scalarCompare(left.data[key.field], right.data[key.field]);
      if (result) return (key.direction === "asc" ? result : -result) as -1 | 1;
    }
    const result = inputRank.get(left.id)! - inputRank.get(right.id)!;
    return result === 0 ? 0 : result < 0 ? -1 : 1;
  };
}

export function executeSortProgram(program: SortProgram): ExecutionResult {
  const checked = validateSortProgram(program);
  if (!checked.ok) throw new Error(checked.errors.map((item) => `${item.path}: ${item.message}`).join("\n"));

  const state = [...program.objects];
  const initialIds = state.map((item) => item.id).sort().join("\u0000");
  const objectsById = Object.fromEntries(program.objects.map((item) => [item.id, item]));
  const compareObjects = createComparator(program);
  const trace: TraceFrame[] = [];
  const settled = new Set<string>();
  let comparisons = 0;
  let mutations = 0;

  const activeIds = (operation: Operation) => {
    if (operation.kind === "compare") return [operation.leftId, operation.rightId];
    if (operation.kind === "swap") return operation.itemIds;
    if (operation.kind === "shift" || operation.kind === "write") return [operation.itemId];
    if (operation.kind === "focus" || operation.kind === "settle") return operation.itemIds;
    return [];
  };
  const emit = (operation: Operation) => {
    if (operation.kind === "settle") operation.itemIds.forEach((id) => settled.add(id));
    const ids = state.map((item) => item.id);
    if (ids.slice().sort().join("\u0000") !== initialIds) throw new Error(`Trace invariant failed at step ${trace.length}.`);
    trace.push({ step: trace.length, state: ids, operation, comparisons, mutations, activeIds: activeIds(operation), settledIds: [...settled] });
  };
  const compare = (left: SortObject, right: SortObject) => {
    comparisons++;
    const result = compareObjects(left, right);
    emit({ kind: "compare", leftId: left.id, rightId: right.id, result });
    return result;
  };
  const swap = (left: number, right: number) => {
    if (left === right) return;
    const itemIds: [string, string] = [state[left].id, state[right].id];
    [state[left], state[right]] = [state[right], state[left]];
    mutations++;
    emit({ kind: "swap", left, right, itemIds });
  };
  const shift = (from: number, to: number) => {
    if (from === to) return;
    const [item] = state.splice(from, 1);
    state.splice(to, 0, item);
    mutations++;
    emit({ kind: "shift", from, to, itemId: item.id });
  };

  emit({ kind: "start" });

  if (program.algorithm.name === "bubble") {
    for (let end = state.length - 1; end > 0; end--) {
      let changed = false;
      for (let index = 0; index < end; index++) {
        if (compare(state[index], state[index + 1]) > 0) {
          swap(index, index + 1);
          changed = true;
        }
      }
      emit({ kind: "settle", itemIds: [state[end].id] });
      if (!changed) break;
    }
  }

  if (program.algorithm.name === "selection") {
    for (let start = 0; start < state.length - 1; start++) {
      let selected = start;
      emit({ kind: "focus", role: "candidate", itemIds: [state[selected].id] });
      for (let index = start + 1; index < state.length; index++) {
        if (compare(state[index], state[selected]) < 0) {
          selected = index;
          emit({ kind: "focus", role: "candidate", itemIds: [state[selected].id] });
        }
      }
      swap(start, selected);
      emit({ kind: "settle", itemIds: [state[start].id] });
    }
  }

  if (program.algorithm.name === "insertion") {
    for (let index = 1; index < state.length; index++) {
      let cursor = index;
      emit({ kind: "focus", role: "run", itemIds: state.slice(0, index + 1).map((item) => item.id) });
      while (cursor > 0 && compare(state[cursor - 1], state[cursor]) > 0) {
        const itemId = state[cursor].id;
        [state[cursor - 1], state[cursor]] = [state[cursor], state[cursor - 1]];
        mutations++;
        emit({ kind: "shift", from: cursor, to: cursor - 1, itemId });
        cursor--;
      }
    }
  }

  if (program.algorithm.name === "merge") {
    const merge = (left: number, middle: number, right: number) => {
      emit({ kind: "focus", role: "run", itemIds: state.slice(left, right + 1).map((item) => item.id) });
      let first = left;
      let second = middle + 1;
      while (first <= middle && second <= right) {
        if (compare(state[first], state[second]) <= 0) first++;
        else {
          shift(second, first);
          first++;
          middle++;
          second++;
        }
      }
    };
    const divide = (left: number, right: number) => {
      if (left >= right) return;
      const middle = Math.floor((left + right) / 2);
      divide(left, middle);
      divide(middle + 1, right);
      merge(left, middle, right);
    };
    divide(0, state.length - 1);
  }

  if (program.algorithm.name === "quick") {
    const partition = (low: number, high: number) => {
      const pivot = state[high];
      emit({ kind: "focus", role: "pivot", itemIds: [pivot.id] });
      let boundary = low;
      for (let index = low; index < high; index++) {
        if (compare(state[index], pivot) < 0) swap(index, boundary++);
      }
      swap(boundary, high);
      emit({ kind: "settle", itemIds: [state[boundary].id] });
      return boundary;
    };
    const sort = (low: number, high: number) => {
      if (low >= high) return;
      const pivot = partition(low, high);
      sort(low, pivot - 1);
      sort(pivot + 1, high);
    };
    sort(0, state.length - 1);
  }

  if (program.algorithm.name === "heap") {
    const heapify = (length: number, root: number) => {
      let largest = root;
      const left = root * 2 + 1;
      const right = left + 1;
      if (left < length && compare(state[left], state[largest]) > 0) largest = left;
      if (right < length && compare(state[right], state[largest]) > 0) largest = right;
      if (largest !== root) {
        swap(root, largest);
        heapify(length, largest);
      }
    };
    for (let index = Math.floor(state.length / 2) - 1; index >= 0; index--) heapify(state.length, index);
    for (let end = state.length - 1; end > 0; end--) {
      swap(0, end);
      emit({ kind: "settle", itemIds: [state[end].id] });
      heapify(end, 0);
    }
  }

  emit({ kind: "settle", itemIds: state.map((item) => item.id) });
  emit({ kind: "done" });
  for (let index = 1; index < state.length; index++) {
    if (compareObjects(state[index - 1], state[index]) > 0) throw new Error(`${program.algorithm.name} failed to sort the program.`);
  }

  return { program, trace, target: state.map((item) => item.id), objectsById };
}
