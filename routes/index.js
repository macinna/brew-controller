var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('new_index', { title: 'Brew' });
});

/* GET controls page. */
router.get('/controls', function(req, res) {
  res.render('controls', { title: 'Controls' });
});

/* GET calendar page. */
router.get('/calendar', function(req, res) {
  res.render('controls', { title: 'Calendar' });
});



module.exports = router;
