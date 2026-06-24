import "../src/loadEnv.js";
import {
  connectMongo,
  getDb,
  getMongoSetupHelp,
  isMongoConfigured,
  resolveMongoDbName,
} from "../src/mongo/client.js";
import { countMongoCollections, ensureMongoIndexes, initMongoCloud } from "../src/mongo/schema.js";

async function main() {
  if (!isMongoConfigured()) {
    console.error(getMongoSetupHelp());
    process.exit(1);
  }

  await connectMongo();
  console.log("Database:", resolveMongoDbName());

  await ensureMongoIndexes(getDb);
  await initMongoCloud(getDb, { dbName: resolveMongoDbName() });

  const counts = await countMongoCollections(getDb);
  console.log("Collection counts:", counts);
  console.log("MongoDB init complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
