const { MongoClient } = require("mongodb");

let cachedClient = null;
let cachedDb = null;

/**
 * Returns a cached MongoDB connection, reusing it across warm Azure Function
 * invocations to avoid the cost of reconnecting on every request.
 */
async function getDb() {
  if (cachedDb) {
    return cachedDb;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || "secure_vault";

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set.");
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri, {
      maxPoolSize: 10,
    });
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db(dbName);
  return cachedDb;
}

async function getCollection() {
  const db = await getDb();
  const collectionName = process.env.MONGODB_COLLECTION || "vault_items";
  const collection = db.collection(collectionName);

  try {
    await collection.createIndex({ name: 1 }, { unique: true, name: "ux_vault_items_name" });
  } catch (error) {
    if (!/already exists/i.test(error.message)) {
      throw error;
    }
  }

  return collection;
}

module.exports = { getDb, getCollection };
