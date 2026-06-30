const { app } = require("@azure/functions");
const { getCollection } = require("../lib/db");
const { decryptJson } = require("../lib/crypto");

function buildItemResponse(record, decrypted) {
  return {
    name: record.name,
    category: record.category,
    ...decrypted,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

app.http("retrieveAll", {
  methods: ["GET"],
  authLevel: "function",
  route: "items",
  handler: async (_request, context) => {
    let records;
    try {
      const collection = await getCollection();
      records = await collection.find({}).sort({ createdAt: 1 }).toArray();
    } catch (err) {
      context.error("MongoDB read failed:", err.message);
      return { status: 502, jsonBody: { error: "Failed to read data." } };
    }

    if (!records?.length) {
      return { status: 200, jsonBody: [] };
    }

    const items = [];
    for (const record of records) {
      let decrypted;
      try {
        decrypted = decryptJson(record.data);
      } catch (err) {
        context.error("Decryption failed:", err.message);
        return { status: 500, jsonBody: { error: "Failed to decrypt stored data. The encryption key may be incorrect or the data corrupted." } };
      }

      items.push(buildItemResponse(record, decrypted));
    }

    return { status: 200, jsonBody: items };
  },
});

app.http("retrieve", {
  methods: ["GET"],
  authLevel: "function",
  route: "items/{name}",
  handler: async (request, context) => {
    const name = request.params.name;

    if (!name || !name.trim()) {
      return { status: 400, jsonBody: { error: "A 'name' route parameter is required, e.g. /api/items/ASB-Bank-Details" } };
    }

    let record;
    try {
      const collection = await getCollection();
      record = await collection.findOne({ name });
    } catch (err) {
      context.error("MongoDB read failed:", err.message);
      return { status: 502, jsonBody: { error: "Failed to read data." } };
    }

    if (!record) {
      return { status: 404, jsonBody: { error: `No item found for name '${name}'.` } };
    }

    let decrypted;
    try {
      decrypted = decryptJson(record.data);
    } catch (err) {
      context.error("Decryption failed:", err.message);
      return { status: 500, jsonBody: { error: "Failed to decrypt stored data. The encryption key may be incorrect or the data corrupted." } };
    }

    return {
      status: 200,
      jsonBody: buildItemResponse(record, decrypted),
    };
  },
});

module.exports = { buildItemResponse };
