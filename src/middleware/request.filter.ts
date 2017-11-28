import * as COOKIE_PARSER from 'cookie-parser';
import * as BODY_PARSER from 'body-parser';
import * as CORS from 'cors';
import * as SESSION from 'express-session';
import { Logger } from './logger';
import * as CONFIG from '../config';
import { injectable, inject } from 'inversify';
import { PassportService } from '../services/auth.service';
const CORS_ALLOWED = CONFIG.CORS.Allowed || false;

const passportService = inject(PassportService);

@injectable()
export class RequestFilter {
  @passportService private passportService: PassportService;

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

  public text() {
    return BODY_PARSER.text({ limit: '100mb' });
  }

  public raw() {
    return BODY_PARSER.raw({ limit: '100mb' });
  }

  public session() {
    return SESSION({
      secret: CONFIG.SESSION_SECRET || 'This is default session secret.',
      resave: false,
      saveUninitialized: false
    });
  }

  public initpass() {
    return this.passportService.initialize();
  }

  public sessionpass() {
    return this.passportService.session();
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
    app.use(this.text());
    app.use(this.raw());
    app.use(this.cookieparser());
    app.use(this.session());
    app.use(this.initpass());
    app.use(this.sessionpass());
  }
}
