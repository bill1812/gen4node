const express = require('express');
const router  = express.Router();

/* GET home page: ES6 support */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' });
});

module.exports = router;
