const express = require('express'),
  router = express.Router();

const sniff = require('../utils/elasticsearch/elasticsearch').sniff,
  configurationdao = new (require('../utils/dao/configuration'))(),
  startTime = Date.now();

router.get('/', function(req, res) {
  const uptime_mills = Date.now() - startTime,
    uptime_secs = uptime_mills / 1000,
    uptime_mins = Math.round(uptime_secs / 60),
    uptime_hrs = Math.round(uptime_mins / 60);

  res.json({
    uptime_mills: uptime_mills,
    uptime_secs: uptime_secs,
    uptime_mins: uptime_mins,
    uptime_hrs: uptime_hrs,
  });
});

router.get('/sniff-es/', function(req, res) {
  sniff()
    .then(function(ok) {
      res.json({
        message: ok,
      });
    })
    .catch(function(nok) {
      res.json({
        message: nok,
      });
    });
});

router.get('/es-auth-version/', function(req, res) {
  configurationdao
    .get(configurationdao.KEY)
    .then(function(configuration) {
      res.send(configuration);
    })
    .catch(function(error) {
      res.status(400).send(error.message);
    });
});

module.exports = router;
