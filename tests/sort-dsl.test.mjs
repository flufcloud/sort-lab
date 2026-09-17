import assert from "node:assert/strict";
import test from "node:test";
import { executeSortProgram, validateSortProgram } from "../lib/sort-dsl.ts";

const algorithmNames = ["bubble", "selection", "insertion", "merge", "quick", "heap"];

function program(name) {
  return {
    dsl: "sort-lab/v1",
    title: "Test objects",
    objects: [
      { id: "d", label: "D", data: { score: 4, group: "b" } },
      { id: "b", label: "B", data: { score: 2, group: "a" } },
      { id: "e", label: "E", data: { score: 2, group: "b" } },
      { id: "a", label: "A", data: { score: 1, group: "a" } },
      { id: "c", label: "C", data: { score: 3, group: "a" } },
    ],
    order: {
      keys: [
        { field: "score", type: "number", direction: "asc" },
        { field: "group", type: "string", direction: "desc" },
      ],
      tieBreak: "input",
    },
    algorithm: { name },
  };
}

for (const name of algorithmNames) {
  test(`${name} emits valid permutation states and reaches the total order`, () => {
    const input = program(name);
    const result = executeSortProgram(input);
    const expectedIds = input.objects.map((item) => item.id).sort();
    assert.deepEqual(result.target, ["a", "e", "b", "c", "d"]);
    assert.equal(result.trace.at(-1).operation.kind, "done");
    for (const frame of result.trace) {
      assert.deepEqual(frame.state.slice().sort(), expectedIds);
      assert.equal(new Set(frame.state).size, input.objects.length);
    }
  });
}

test("input position breaks equal keys deterministically", () => {
  const input = program("quick");
  input.objects[0].data.score = 2;
  input.objects[0].data.group = "b";
  const result = executeSortProgram(input);
  assert.ok(result.target.indexOf("d") < result.target.indexOf("e"));
});

test("validation rejects duplicate IDs and order type mismatches", () => {
  const input = program("merge");
  input.objects[1].id = "d";
  input.objects[2].data.score = "two";
  const result = validateSortProgram(input);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.path === "objects[1].id"));
  assert.ok(result.errors.some((item) => item.path === "objects[2].data.score"));
});
