import { injectable, inject } from 'inversify';
import { controller, all, request, response, BaseHttpController } from 'inversify-express-utils';
import { Logger } from '../middleware/logger';
import { ElasticSearchService } from '../services/elasticsearch.service';
import * as express from 'express';
import { INDEX as userIndex } from '../entities/user';
import { AuthService } from '../services/auth.service';

const pattern = /\/+/g;

@injectable()
@controller('/es/', AuthService.authenticate())
export class ElasticSearchController extends BaseHttpController {
  public constructor(
    @inject(Logger) private logger: Logger,
    @inject(ElasticSearchService) private esService: ElasticSearchService
  ) {
    super();
  }

  @all('*')
  public all(@request() req: express.Request, @response() res: express.Response) {
    if (!this.canAcess(req)) {
      this.logger.warn('Tried to access a forbidden es endpoint. User has no access');
      res.status(403).send('Not allowed');
      return;
    }

    this.esService.proxy(req, res);
  }

  private canAcess(req: express.Request) {
    const user_ = this.httpContext.user.details;

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

    if (segments.indexOf('_search') !== -1 || segments[segLen - 1].indexOf('_search') !== -1) {
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
}
