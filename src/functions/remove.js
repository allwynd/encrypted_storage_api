const { app } = require("@azure/functions");
const { getCollection } = require("../lib/db");

app.http("remove", {
  methods: ["DELETE"],
  authLevel: "function",
  route: "items/{id}",
  handler: async (request, context) => {
    const id = request.params.id;

    if (!id || !id.trim()) {
      return { status: 400, jsonBody: { error: "An 'id' route parameter is required, e.g. /api/items/item-123" } };
    }

    try {
      const collection = await getCollection();
      const result = await collection.deleteOne({ _id: require("mongodb").ObjectId.createFromHexString(id) });

      if (result.deletedCount === 0) {
        return { status: 404, jsonBody: { error: `No record found for id '${id}'.` } };
      }

      return {
        status: 200,
        jsonBody: {
          message: "Deleted successfully.",
          id,
        },
      };
    } catch (err) {
      context.error("MongoDB delete failed:", err.message);
      return { status: 502, jsonBody: { error: "Failed to delete data." } };
    }
  },
});
