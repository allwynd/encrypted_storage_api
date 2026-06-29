const { app } = require("@azure/functions");
const { getCollection } = require("../lib/db");

app.http("remove", {
  methods: ["DELETE"],
  authLevel: "function",
  route: "items/{name}",
  handler: async (request, context) => {
    const name = request.params.name;

    if (!name || !name.trim()) {
      return { status: 400, jsonBody: { error: "A 'name' route parameter is required, e.g. /api/items/ASB-Bank-Details" } };
    }

    try {
      const collection = await getCollection();
      const result = await collection.deleteOne({ name });

      if (result.deletedCount === 0) {
        return { status: 404, jsonBody: { error: `No record found for name '${name}'.` } };
      }

      return {
        status: 200,
        jsonBody: {
          message: "Deleted successfully.",
          name,
        },
      };
    } catch (err) {
      context.error("MongoDB delete failed:", err.message);
      return { status: 502, jsonBody: { error: "Failed to delete data." } };
    }
  },
});
