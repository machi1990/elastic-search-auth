/**
 * Mostly middleware
 */
const cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  cors_ = require('cors'),
  session = require('express-session'),
  passport = require('./passport').passport,
  passportType = require('./passport').type,
  currentuser = require('./passport').currentuser,
  AUTH_HEADER = 'AuthenticationSid',
  auth = require('./authenticate').authField,
  remove = require('./authenticate').remove,
  BadRequest = require('./badrequest'),
  logger = new (require('../logger/logger'))();

/**
 * Setups
 */
const config = require('../../setup'),
  corsAllowed = config.CORS.Allowed || false;

/**
 * Routes
 */
const index = require('../../routes/index'),
  users = require('../../routes/users'),
  configurations = require('../../routes/configurations'),
  es = require('../../routes/elasticsearch');

class Session {
  static authenticate(middleware) {
    return [passport.authenticate(passportType), middleware];
  }

  static login() {
    return Session.authenticate((req, res) => {
      const user_ = currentuser(req);

      /**
       * Remove unneeded fileds.
       */
      delete user_[auth];
      delete user_.date;
      delete user_.__server;

      res.setHeader(
        AUTH_HEADER,
        req.user ? req.user[auth] : req.headers['authorization']
      );
      res.json(user_);
    });
  }

  static logout() {
    return (req, res) => {
      remove(req.user[auth]); // remove from session before user logout

      req.logout();
      res.json({ message: 'Logged out' });
    };
  }
}

module.exports = class RequestFilter {
  static cors() {
    return cors_();
  }

  static cookieparser() {
    return cookieParser();
  }

  static jsonparser() {
    return bodyParser.json({ limit: '100mb' });
  }

  static urlencoded() {
    return bodyParser.urlencoded({ limit: '100mb', extended: false });
  }

  static session() {
    return session({
      secret: config.SESSION_SECRET || 'This is default session secret.',
      resave: false,
      saveUninitialized: false,
    });
  }

  static initpass() {
    return passport.initialize();
  }

  static sessionpass() {
    return passport.session();
  }

  static logs() {
    return logger.requestConnector();
  }

  /**
   * Update auth token header.
   */

  static setAuthToken() {
    return (req, res, next) => {
      res.setHeader(
        AUTH_HEADER,
        req.user ? req.user[auth] : req.headers['authorization']
      );
      next();
    };
  }

  static call(req, res, middleware) {
    res.setHeader(
      AUTH_HEADER,
      req.user ? req.user[auth] : req.headers['authorization']
    );
    middleware(req, res);
  }

  static config(app) {
    RequestFilter.configureMiddlewares(app);
    RequestFilter.configureRoutes(app);
    BadRequest.config(app);
  }

  /**
   * Use application-level middleware for common functionality.
   * This includes parsing, authentication and session handling.
   */

  static configureMiddlewares(app) {
    if (corsAllowed) {
      app.use(RequestFilter.cors());
    }

    app.use(RequestFilter.jsonparser());
    app.use(RequestFilter.urlencoded());
    app.use(RequestFilter.cookieparser());
    app.use(RequestFilter.logs());
    app.use(RequestFilter.session());
    app.use(RequestFilter.initpass());
    app.use(RequestFilter.sessionpass());
  }

  static configureRoutes(app) {
    app.get('/ws/login', Session.login());
    app.post('/ws/login', Session.login());
    app.get('/ws/logout', Session.logout());

    app.use('/ws/', index);

    app.use('/ws/users/', passport.authenticate(passportType), (req, res) => {
      RequestFilter.call(req, res, users);
    });

    app.use('/ws/es/', passport.authenticate(passportType), (req, res) => {
      RequestFilter.call(req, res, es);
    });

    app.use(
      '/ws/configurations/',
      passport.authenticate(passportType),
      (req, res) => {
        RequestFilter.call(req, res, configurations);
      }
    );
  }
};
