const BasicStrategy = require('passport-http').BasicStrategy,
  passport = require('passport'),
  LdapStrategy = require('passport-ldapauth'),
  config = require('../../setup'),
  basicAuth = require('basic-auth');

const authenticate = require('./authenticate').authenticate,
  get = require('./authenticate').get,
  put = require('./authenticate').put,
  auth = require('./authenticate').authField,
  uuid = require('../uuid/uuid');

/**
 * Default authentication field
 */
const strategyOpts = {
  usernameField: 'username',
  passwordField: 'password',
  type: 'basic', // ldapauth for ldap,
  server: {
    url: 'ldap://localhost:389',
    bindDn: 'cn=root',
    bindCredentials: 'secret',
    searchBase: 'ou=passport-ldapauth',
    searchFilter: '(uid={{username}})',
  },
};

const supportedStrategies = {
  local: true,
  ldap: true,
};

if (config.AUTH) {
  strategyOpts.usernameField =
    config.AUTH.usernameField || strategyOpts.usernameField;
  strategyOpts.passwordField =
    config.AUTH.passwordField || strategyOpts.passwordField;
  strategyOpts.type =
    config.AUTH.type in supportedStrategies
      ? config.AUTH.type
      : strategyOpts.type;
  strategyOpts.server = config.AUTH.ldapOpts || strategyOpts.server;
}

const strategy = () => {
  if (strategyOpts.type === 'basic') {
    return new BasicStrategy(
      {
        passReqToCallback: true,
      },
      localStrategyCb
    );
  }

  return new LdapStrategy(
    {
      server: supportedStrategies.server,
      credentialsLookup: basicAuth,
      passReqToCallback: true,
    },
    strategyCb
  );
};

const localStrategyCb = (req, username, password, passportCb) => {
  if (!username || !password) {
    return passportCb(null, false);
  }

  /**
   * Authentication.
   */
  return authenticate({
    username: username,
    password: password,
  })
    .then(user => {
      return strategyCb(req, user, passportCb);
    })
    .catch(error => {
      return passportCb(null, false);
    });
};

const strategyCb = (req, user, passportCb) => {
  /**
   * Session generation
   */
  if (!user) {
    return passportCb(null, user);
  }

  if (user[auth] === undefined) {
    put(uuid(), user);
  }

  return passportCb(null, user);
};

/**
 * TODO
 * The local strategy require a `verify` function which receives the credentials
 * (`username` and `password`) submitted by the user.  The function must verify
 * that the password is correct and then invoke `cb` with a user object, which
 * will be set at `req.user` in route handlers after authentication.
 */
passport.use(strategy());

/**
 * TODO
 *
 * Configure Passport authenticated session persistence.
 * In order to restore authentication state across HTTP requests, Passport needs
 * to serialize users into and deserialize users out of the session.  The
 * typical implementation of this is as simple as supplying the user ID when
 * serializing, and querying the user record by ID from the database when
 * deserializing.
 */
passport.serializeUser((user, callback) => {
  callback(null, user[auth]);
});

passport.deserializeUser((uuid_, callback) => {
  get(uuid_)
    .then(user_ => {
      callback(null, user_);
    })
    .catch(_ => {
      callback(null, false);
    });
});

module.exports = {
  passport: passport,
  type: strategyOpts.type,
  currentuser: req => {
    /**
     * Clone
     */
    const user_ = req.user || {};
    user_.passportType = strategyOpts.type;
    return Object.assign({}, user_); // send empty object to avoid undefinedness check
  },
};
