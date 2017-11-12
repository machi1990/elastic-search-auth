import * as express from 'express';
import {
  interfaces,
  controller,
  httpGet,
  httpPost,
  httpDelete,
  request,
  queryParam,
  response,
  requestParam,
} from 'inversify-express-utils';
import { injectable, inject } from 'inversify';
import { ElasticSearchService } from '../services/elasticsearch.service';

@injectable()
@controller('/')
export class IndexController {
  private static readonly START_TIME = Date.now();
  public constructor(
    @inject(ElasticSearchService) private esService: ElasticSearchService
  ) {
  }

  @httpGet('/')
  public uptime(): Object {
    const UPTIME_MILLS = Date.now() - IndexController.START_TIME,
      UPTIME_SECS = UPTIME_MILLS / 1000,
      UPTIME_MINS = Math.round(UPTIME_SECS / 60),
      UPTIME_HRS = Math.round(UPTIME_MINS / 60);

    return {
      millis: UPTIME_MILLS,
      minutes: UPTIME_MINS,
      seconds: UPTIME_SECS,
      hours: UPTIME_HRS,
    };
  }

  @httpGet('/sniff')
  public sniff(@request() req: express.Request,
    @response() res: express.Response): void {
    this.esService.sniff().then(_ => res.json(_)).catch(_ => {
        res.status(500).send(_);
    });
  }
}
