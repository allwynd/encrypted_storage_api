const test = require("node:test");
const assert = require("node:assert/strict");
const { validateStorePayload } = require("../src/lib/validate");
const { buildItemResponse } = require("../src/functions/retrieve");

test("store payload validation accepts name and category", () => {
  const { valid, errors } = validateStorePayload({
    name: "ASB-Bank-Details",
    category: "Bank",
    email: "user@example.com",
    password: "s3cret-password",
  });

  assert.equal(valid, true);
  assert.deepEqual(errors, []);
});

test("store payload validation requires name and category", () => {
  const { valid, errors } = validateStorePayload({
    email: "user@example.com",
    password: "s3cret-password",
  });

  assert.equal(valid, false);
  assert.ok(errors.some((error) => error.includes("'name'")));
  assert.ok(errors.some((error) => error.includes("'category'")));
});

test("buildItemResponse returns a normalized payload for a single record", () => {
  const payload = buildItemResponse({
    _id: { toString: () => "64c0c4d1e2b3f4a5b6c7d8e9" },
    name: "ASB-Bank-Details",
    category: "Bank",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
    data: "encrypted-payload",
  }, { email: "user@example.com" });

  assert.equal(payload.id, "64c0c4d1e2b3f4a5b6c7d8e9");
  assert.equal(payload.name, "ASB-Bank-Details");
  assert.equal(payload.category, "Bank");
  assert.equal(payload.email, "user@example.com");
  assert.equal(payload.createdAt, "2024-01-01T00:00:00.000Z");
});
