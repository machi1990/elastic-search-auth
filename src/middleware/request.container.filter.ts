import * as COOKIE_PARSER from 'cookie-parser';
import * as BODY_PARSER from 'body-parser';
import * as CORS from 'cors';
import * as SESSION from 'express-session';
import * as PASSPORT from 'PASSPORT';
import { Logger } from './logger';
import * as CONFIG  from '../config';
import { injectable } from 'inversify';
const CORS_ALLOWED = CONFIG.CORS.Allowed || false;

@injectable()
export class RequestFilter {
  public cors() {
    return CORS();
  }

  public cookieparser() {
    return COOKIE_PARSER();
  }

  public jsonparser() {
    return BODY_PARSER.json({ limit: '100mb' });
  }

  public urlencoded() {
    return BODY_PARSER.urlencoded({ limit: '100mb', extended: false });
  }

  public session() {
    return SESSION({
      secret: CONFIG.SESSION_SECRET || 'This is default session secret.',
      resave: false,
      saveUninitialized: false,
    });
  }

  public initpass() {
    return PASSPORT.initialize();
  }

  public sessionpass() {
    return PASSPORT.session();
  }

  /**
   * Use application-level middleware for common functionality.
   * This includes parsing, authentication and session handling.
   */

  public configureMiddlewaresFor(app) {
    if (CORS_ALLOWED) {
      app.use(this.cors());
    }

    app.use(this.jsonparser());
    app.use(this.urlencoded());
    app.use(this.cookieparser());
    app.use(this.session());
    app.use(this.initpass());
    app.use(this.sessionpass());
  }
}
