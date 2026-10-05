import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contractUrl, outputUrl, generateTypes } from "../scripts/generate-commerce-types.mjs";

const contract = JSON.parse(readFileSync(contractUrl, "utf8"));

test("checked-in commerce types match the shared API contract", () => {
  assert.equal(readFileSync(outputUrl, "utf8"), generateTypes(contract));
});

test("all contract references resolve and operation IDs are unique", () => {
  const ids = new Set<string>();
  for (const [path, methods] of Object.entries(contract.paths)) {
    for (const operation of Object.values(methods as Record<string, any>)) {
      assert.ok(!ids.has(operation.operationId), operation.operationId);
      ids.add(operation.operationId);
      for (const parameter of path.matchAll(/\{([^}]+)\}/g)) {
        assert.ok(operation.parameters.some((p: any) => p.in === "path" && p.name === parameter[1] && p.required));
      }
    }
  }
  function visit(value: any) {
    if (!value || typeof value !== "object") return;
    if (value.$ref) {
      assert.ok(value.$ref.startsWith("#/"));
      assert.ok(value.$ref.slice(2).split("/").reduce((node: any, key: string) => node?.[key], contract), value.$ref);
    }
    Object.values(value).forEach(visit);
  }
  visit(contract);
});

test("type generator rejects unsupported constructs and unresolved references", () => {
  for (const schema of [{ oneOf: [{ type: "string" }] }, { $ref: "#/components/schemas/Missing" }, { type: "surprise" }, { type: "object", additionalProperties: true }]) {
    assert.throws(() => generateTypes({ components: { schemas: { Example: schema } } }));
  }
});
