const express = require('express'),
  router = express.Router(),
  currentuser = require('../utils/filters/passport').currentuser,
  configurationdao = new (require('../utils/dao/configuration'))(),
  pattern = /[^a-zA-Z0-9]/gi,
  isAdmin = req => {
    const user_ = currentuser(req);
    return Promise.resolve(user_.role === 'ADMIN');
  };

router.post('*', (req, res, next) => {
  isAdmin(req).then(ok => {
    if (!ok) {
      res.status(403).send('Not allowed');
      return;
    }
    next();
  });
});

router.put('*', (req, res, next) => {
  isAdmin(req)
    .then(ok => {
      next();
    })
    .catch(nok => {
      res.status(403).send('Not allowed');
    });
});

router.delete('*', (req, res, next) => {
  isAdmin(req)
    .then(ok => {
      next();
    })
    .catch(nok => {
      res.status(403).send('Not allowed');
    });
});

router.get('/list', (req, res) => {
  configurationdao
    .configurations(req.query)
    .then(configuratios => {
      res.json(configurations);
    })
    .catch(error => {
      res.status(400).send(error.message);
    });
});

router.get('/view/:key', (req, res) => {
  const key = req.params.key;

  configurationdao
    .get(key)
    .then(configuration => {
      res.send(configuration);
    })
    .catch(error => {
      res.status(400).send(error.message);
    });
});

router.delete('/delete/:key', (req, res) => {
  const key = req.params.key;

  if (configurationdao.KEY === key) {
    res.status(400).send('Not allowed');
    return;
  }

  configurationdao
    .delete(key)
    .then(ok => {
      res.send(ok);
    })
    .catch(nok => {
      res.status(400).send(nok);
    });
});

router.put('/edit/', (req, res) => {
  const configuration_ = req.body;

  if (!configuration_ || !configuration_.key) {
    res.status(400).send('Malformed');
    return;
  }

  configurationdao
    .update(configuration_)
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      res.status(400).send(error.message);
    });
});

router.post('/create/', (req, res) => {
  const configuration_ = req.body;

  if (!configuration_ || !configuration_.key) {
    res.status(400).send('Malformed');
    return;
  }

  configurationdao
    .create(configuration_)
    .then(result => {
      res.json({
        message: 'Successfully created.',
      });
    })
    .catch(error => {
      res.json({
        message: 'Not successfully created.',
      });
    });
});

module.exports = router;
