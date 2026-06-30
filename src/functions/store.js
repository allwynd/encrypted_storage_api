const { app } = require("@azure/functions");
const { getCollection } = require("../lib/db");
const { encryptJson } = require("../lib/crypto");
const { validateStorePayload } = require("../lib/validate");

app.http("store", {
  methods: ["PUT"],
  authLevel: "function",
  route: "items",
  handler: async (request, context) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Request body must be valid JSON." } };
    }

    const { valid, errors } = validateStorePayload(body);
    if (!valid) {
      return { status: 400, jsonBody: { error: "Validation failed.", details: errors } };
    }

    const { name, category, email, password, pin, secrets } = body;

    // Everything sensitive is bundled together and encrypted as one blob.
    const sensitivePayload = {
      email,
      password,
      pin: pin ?? null,
      secrets: secrets ?? [],
    };

    let encrypted;
    try {
      encrypted = encryptJson(sensitivePayload);
    } catch (err) {
      context.error("Encryption failed:", err.message);
      return { status: 500, jsonBody: { error: "Server encryption configuration error." } };
    }

    let result;
    try {
      const collection = await getCollection();
      const now = new Date();

      result = await collection.insertOne({
        name,
        category,
        data: encrypted,
        createdAt: now,
        updatedAt: now,
      });
    } catch (err) {
      context.error("MongoDB write failed:", err.message);
      return { status: 502, jsonBody: { error: "Failed to persist data." } };
    }

    return {
      status: 200,
      jsonBody: {
        message: "Stored successfully.",
        id: result.insertedId.toString(),
        name,
      },
    };
  },
});
