const test = require("node:test");
const assert = require("node:assert/strict");
const { validateStorePayload } = require("../src/lib/validate");

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
