const express = require('express');
const router  = express.Router();

/* GET users listing: ES6 support */
router.get('/', (req, res, next) => {
  res.send('respond with a resource');
});

module.exports = router;
