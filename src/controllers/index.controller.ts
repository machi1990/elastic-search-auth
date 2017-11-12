import * as express from 'express';
import {controller,httpGet} from 'inversify-express-utils';
import { injectable, inject } from 'inversify';
import { ElasticSearchService } from '../services/elasticsearch.service';
import { ConfigurationService } from '../services/configuration.service';

@injectable()
@controller('/home')
export class IndexController {
  private static readonly START_TIME = Date.now();
  public constructor(
    @inject(ElasticSearchService) private esService: ElasticSearchService, @inject(ConfigurationService) private configService: ConfigurationService
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

  @httpGet('/sniff-es')
  public async sniff() {
        return await this.esService.sniff();   
  }

  @httpGet('/es-auth-version')
  public async esVersion() {
    return await this.configService.get(this.configService.key);
  }
}
