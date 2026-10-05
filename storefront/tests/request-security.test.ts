import test from "node:test";
import assert from "node:assert/strict";
import { sameOrigin, validIdentifier, validQuantity } from "../lib/request-security";
test("cookie mutations require the exact origin", () => {
  assert.equal(sameOrigin("https://wellisha.example", "https://wellisha.example/cart"), true);
  for (const origin of [null, "null", "https://attacker.example", "https://wellisha.example.attacker.example"]) {
    assert.equal(sameOrigin(origin, "https://wellisha.example/cart"), false);
  }
});
test("cart quantity cannot be negative, fractional, null or unbounded", () => {
  for (const value of [null, undefined, 0, -1, 1.5, "1", NaN, Infinity, 101]) assert.equal(validQuantity(value), false);
  assert.equal(validQuantity(1), true); assert.equal(validQuantity(100), true);
});
test("identifiers cannot contain SQL or path payloads", () => {
  for (const value of [null, "", "../orders", "x' OR 1=1 --", "a".repeat(101)]) assert.equal(validIdentifier(value), false);
  assert.equal(validIdentifier("cuid_123"), true);
});

