const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, './config.env'), dotenv_config_debug:true });

module.exports = {
    isAuth(req, res, next) {
        const validAuthVal = process.env.BASIC_AUTH || '';
        const auth = req.headers.authorization;
        if (auth === validAuthVal) {
          next();
        } else {
          res.status(401);
          res.send('Access forbidden');
        }
    }
  };