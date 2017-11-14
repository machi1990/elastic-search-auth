import { Logger } from '../middleware/logger';
import { inject, injectable } from 'inversify';
import * as compression from 'compression';

const logger = inject(Logger);

@injectable()
export class ResponseFilter {
  @logger private logger: Logger;

  public config(app) {
    app.use(
      compression({
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            // don't compress responses with this request header
            return false;
          }

          // fallback to standard filter function
          return compression.filter(req, res);
        }
      })
    );
    app.use(this.logger.responseConnector());
  }
}
