const express = require('express'),
  router = express.Router();

const es = require('../utils/elasticsearch/elasticsearch').proxy,
  currentuser = require('../utils/filters/passport').currentuser,
  userIndex = new (require('../utils/dao/user'))().index;

const pattern = /\/+/g;

function canAccess(req) {
  const user_ = currentuser(req);

  if (!user_ || !user_.role) {
    return false;
  }

  const segments = req.url.split(pattern).filter(function(segment) {
    return segment.length;
  });

  const segLen = segments.length;
  if (!segLen) {
    return true;
  }

  if (segments[0] === userIndex) {
    return false;
  }

  if (
    segments.indexOf('_search') !== -1 ||
    segments[segLen - 1].indexOf('_search') !== -1
  ) {
    /**
     * Transform all searches with _all wildcard to search * wildcard search
     */
    if (segments[0] === '_all') {
      segments[0] = '*';
    }

    /**
     * Exclude searches for user index
     */
    req.url = '/' + segments[0] + ',-*' + userIndex;

    for (var i = 1; i < segments.length; ++i) {
      req.url += '/' + segments[i];
    }
  }

  return true;
}

router.all('*', function(req, res) {
  if (canAccess(req)) {
    es(req, res);
  } else {
    res.status(403).send('Not allowed');
  }
});

module.exports = router;
