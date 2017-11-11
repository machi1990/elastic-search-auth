const express = require('express'),
  router = express.Router();

const currentuser = require('../utils/filters/passport').currentuser,
  configurationdao = new (require('../utils/dao/configuration'))();

const pattern = /[^a-zA-Z0-9]/gi;

function isAdmin(req) {
  const user_ = currentuser(req);

  return Promise.resolve(user_.role === 'ADMIN');
}

router.post('*', function(req, res, next) {
  isAdmin(req).then(function(ok) {
    if (!ok) {
      res.status(403).send('Not allowed');
      return;
    }

    next();
  });
});

router.put('*', function(req, res, next) {
  isAdmin(req)
    .then(function(ok) {
      next();
    })
    .catch(function(nok) {
      res.status(403).send('Not allowed');
    });
});

router.delete('*', function(req, res, next) {
  isAdmin(req)
    .then(function(ok) {
      next();
    })
    .catch(function(nok) {
      res.status(403).send('Not allowed');
    });
});

router.get('/list', function(req, res) {
  configurationdao
    .configurations(req.query)
    .then(function(configurations) {
      res.json(configurations);
    })
    .catch(function(error) {
      res.status(400).send(error.message);
    });
});

router.get('/view/:key', function(req, res) {
  const key = req.params.key;

  configurationdao
    .get(key)
    .then(function(configuration) {
      res.send(configuration);
    })
    .catch(function(error) {
      res.status(400).send(error.message);
    });
});

router.delete('/delete/:key', function(req, res) {
  const key = req.params.key;

  if (configurationdao.KEY === key) {
    res.status(400).send('Not allowed');
    return;
  }

  configurationdao
    .delete(key)
    .then(function(ok) {
      res.send(ok);
    })
    .catch(function(nok) {
      res.status(400).send(nok);
    });
});

router.put('/edit/', function(req, res) {
  const configuration_ = req.body;

  if (!configuration_ || !configuration_.key) {
    res.status(400).send('Malformed');
    return;
  }

  configurationdao
    .update(configuration_)
    .then(function(result) {
      res.json(result);
    })
    .catch(function(error) {
      res.status(400).send(error.message);
    });
});

router.post('/create/', function(req, res) {
  const configuration_ = req.body;

  if (!configuration_ || !configuration_.key) {
    res.status(400).send('Malformed');
    return;
  }

  configurationdao
    .create(configuration_)
    .then(function(result) {
      res.json({
        message: 'Successfully created.',
      });
    })
    .catch(function(error) {
      res.json({
        message: 'Not successfully created.',
      });
    });
});

module.exports = router;
