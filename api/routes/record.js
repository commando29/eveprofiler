const express = require('express');
const { CharacterStats } = require("../utils/characterstats.js");
const { isAuth } = require('../utils/basicauth.js');
// recordRoutes is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests.
const recordRoutes = express.Router();

// This will help us connect to the database
const dbo = require('../db/conn');

recordRoutes.route('/').get(isAuth, async function (request, res) {
  console.log(`Called base route.`);
  res.send("");
});

// This section will help you get a list of all the records.
/*recordRoutes.route('/systemdetails/region/:region_id').get(async function (request, res) {
  const dbConnect = dbo.getDb();

  dbConnect
    .collection('vw_system_details')
    .find({"region_id":  parseInt(request.params.region_id)})
    .limit(50)
    .toArray(function (err, result) {
      if (err) {
        res.status(400).send('Error fetching listings!');
      } else {
        res.json(result);
      }
    });
});*/


// This section will help you get a list of all the records.
recordRoutes.route('/character/:character_id').get(isAuth, async function (request, res) {
  const dbConnect = dbo.getDb();
  var x = new CharacterStats();
  var character = await x.constructCharacterStats(parseInt(request.params.character_id));
  if (character) {
    res.json(character);
  }
});

module.exports = recordRoutes;