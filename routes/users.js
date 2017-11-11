const express = require('express'),
  router = express.Router(),
  currentuser = require('../utils/filters/passport').currentuser,
  userdao = new (require('../utils/dao/user'))(),
  pattern = /[^a-zA-Z0-9\.]/,
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
  /**
   * Authorize a change of password to all users.
   */
  if (req.url.startsWith('/change/password')) {
    next();
    return;
  }

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

router.get('/roles', (req, res) => {
  res.json(userdao.roles);
});

router.get('/list', (req, res) => {
  userdao
    .users(req.query)
    .then(users => {
      res.json(users);
    })
    .catch(error => {
      res.status(400).send(error.message);
    });
});

router.get('/view/:username', (req, res) => {
  const username = req.params.username;

  userdao
    .get(username)
    .then(user => {
      res.json(user);
    })
    .catch(error => {
      res.status(400).send(error.message);
    });
});

router.delete('/delete/:username', (req, res) => {
  const username = req.params.username;

  userdao
    .delete(username)
    .then(ok => {
      res.send(ok);
    })
    .catch(nok => {
      res.status(400).send(nok);
    });
});

router.put('/change/password/', (req, res) => {
  const newpassword = req.body.password;

  const user_ = {
    username: currentuser(req).username,
    password: userdao.generatePassword(newpassword),
  };

  userdao
    .update(user_)
    .then(result => {
      res.json({
        message: 'Password changed',
      });
    })
    .catch(error => {
      res.status(400).send(error.message);
    });
});

router.put('/edit/', (req, res) => {
  const user_ = req.body;

  /**
   * Ensure password field is not there.
   */
  delete user_.password;

  userdao
    .update(user_)
    .then(result => {
      res.json(result);
    })
    .catch(error => {
      res.status(400).send(error.message);
    });
});

router.post('/create/', (req, res) => {
  const user_ = req.body;

  if (!user_.username) {
    res.status(400).send('Missing username');
    return;
  }

  const loginLen = user_.username.length;

  if (loginLen < 3 || loginLen > 20) {
    res.status(400).send('Username must be between 3 to 20 characters.');
    return;
  }

  if (pattern.test(user_.username)) {
    res
      .status(400)
      .send('Username invalid: Only alphanumeric characters allowed.');
    return;
  }

  if (!user_.password) {
    res.status(400).send('Missing password');
    return;
  }

  const pwdLen = user_.password.length;

  if (pwdLen < 6 || pwdLen > 30) {
    res.status(400).send('Password must be between 6 to 20 characters');
    return;
  }

  userdao
    .create(user_)
    .then(result => {
      res.json({
        message: 'Successfully created.',
      });
    })
    .catch(error => {
      res.json({
        message:
          'Not successfully created. Verify that the same username is not already present.',
      });
    });
});

module.exports = router;
