  require("dotenv").config(); // đảm bảo load .env
  const { MongoClient } = require("mongodb");

  const uri = process.env.MONGO_URI;
  const client = new MongoClient(uri);

  async function db() {
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log(`đã kết nối tới db `)
    }
    return client.db();
  }

  module.exports = db;
