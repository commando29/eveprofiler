const path = require('path')
// Loads the configuration from config.env to process.env
require('dotenv').config({ path: path.resolve(__dirname, './config.env'), dotenv_config_debug:true });
var morgan = require('morgan');
const express = require('express');
const cors = require('cors');
// get MongoDB driver connection
const dbo = require('./db/conn');

var winston = require('./config/winston');

const cleanup = (event) => { // SIGINT is sent for example when you Ctrl+C a running process from the command line.
  dbo.closeDB(); // Close MongodDB Connection when Process ends
  process.exit(); // Exit with default success-code '0'.
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(require('./routes/record'));
app.use(morgan('combined', { stream: winston.stream }));

// Global error handling
app.use(function (err, request, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// perform a database connection when the server starts
dbo.connectToServer(function (err) {
  if (err) {
    console.error(err);
    process.exit();
  }

  // start the Express server
  app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
  });
});