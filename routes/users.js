const express = require('express'),
  router = express.Router();

const currentuser = require('../utils/filters/passport').currentuser,
  userdao = new (require('../utils/dao/user'))();

const pattern = /[^a-zA-Z0-9\.]/;

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
  /**
   * Authorize a change of password to all users.
   */
  if (req.url.startsWith('/change/password')) {
    next();
    return;
  }

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

router.get('/roles', function(req, res) {
  res.json(userdao.roles);
});

router.get('/list', function(req, res) {
  userdao
    .users(req.query)
    .then(function(users) {
      res.json(users);
    })
    .catch(function(error) {
      res.status(400).send(error.message);
    });
});

router.get('/view/:username', function(req, res) {
  const username = req.params.username;

  userdao
    .get(username)
    .then(function(user) {
      res.json(user);
    })
    .catch(function(error) {
      res.status(400).send(error.message);
    });
});

router.delete('/delete/:username', function(req, res) {
  const username = req.params.username;

  userdao
    .delete(username)
    .then(function(ok) {
      res.send(ok);
    })
    .catch(function(nok) {
      res.status(400).send(nok);
    });
});

router.put('/change/password/', function(req, res) {
  const newpassword = req.body.password;

  const user_ = {
    username: currentuser(req).username,
    password: userdao.generatePassword(newpassword),
  };

  userdao
    .update(user_)
    .then(function(result) {
      res.json({
        message: 'Password changed',
      });
    })
    .catch(function(error) {
      res.status(400).send(error.message);
    });
});

router.put('/edit/', function(req, res) {
  const user_ = req.body;

  /**
   * Ensure password field is not there.
   */
  delete user_.password;

  userdao
    .update(user_)
    .then(function(result) {
      res.json(result);
    })
    .catch(function(error) {
      res.status(400).send(error.message);
    });
});

router.post('/create/', function(req, res) {
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
    .then(function(result) {
      res.json({
        message: 'Successfully created.',
      });
    })
    .catch(function(error) {
      res.json({
        message:
          'Not successfully created. Verify that the same username is not already present.',
      });
    });
});

module.exports = router;
