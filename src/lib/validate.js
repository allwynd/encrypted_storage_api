/**
 * Validates the shape of a "store" request body.
 *
 * Expected shape:
 * {
 *   "name": "ASB-Bank-Details",
 *   "category": "Bank",
 *   "email": "user@example.com",
 *   "password": "secret",
 *   "pin": "1234",               // optional
 *   "secrets": [                 // optional line items
 *     { "label": "Account Number", "value": "123-456-789" },
 *     { "label": "Security Question", "value": "..." }
 *   ]
 * }
 */
function validateStorePayload(body) {
  const errors = [];

  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["Request body must be a JSON object."] };
  }

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    errors.push("'name' is required and must be a non-empty string (e.g. 'ASB-Bank-Details').");
  }

  if (!body.category || typeof body.category !== "string" || !body.category.trim()) {
    errors.push("'category' is required and must be a non-empty string (e.g. 'Bank').");
  }

  // only validate email is in correct format if it is provided
  if (body.email !== undefined) {
    if (typeof body.email !== "string" || !body.email.trim()) {
      errors.push("'email' must be a non-empty string when provided.");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        errors.push("'email' must be a valid email address when provided.");
      }
    }
  }

  if (body.secrets !== undefined) {
    if (!Array.isArray(body.secrets)) {
      errors.push("'secrets' is optional but must be an array of line items when provided.");
    } else {
      body.secrets.forEach((item, idx) => {
        if (!item || typeof item !== "object" || typeof item.label !== "string" || typeof item.value !== "string") {
          errors.push(`'secrets[${idx}]' must be an object with string 'label' and 'value' fields.`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateStorePayload };
