const { MongoClient, ServerApiVersion } = require('mongodb');
const connectionString = process.env.ATLAS_URI;
const client = new MongoClient(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1
});

let dbConnection;

module.exports = {
  connectToServer: async function (callback) {
    try {
      console.log('About to try db connection...');
      await client.connect();
      dbConnection = client.db('mapper');
      return callback();
    }
    catch(error) {
      throw error;
    }
  },

  getDb: function () {
    return dbConnection;
  },

  closeDB: async function () {
    await client.close();
  }
};