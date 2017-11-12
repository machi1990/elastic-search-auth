import * as elasticsearch from 'elasticsearch';
import * as process from 'process';
import * as assert from 'assert';
import * as request from 'request-promise';
import { Response, Request } from 'express';
import * as CONFIG from '../config';
import { isObject, cron } from '../utils';
import { inject, injectable } from 'inversify';
import { Logger } from '../middleware/logger';
import { MailingService } from './mailing.service';

const error = (res, message) => {
  res.status(500);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(message, null, 1));
};

assert.notEqual(CONFIG.ES, undefined, 'Elasticsearch opts required');
assert.equal(true, isObject(CONFIG.ES), 'Elasticsearch config must be an object');
assert.notEqual(CONFIG.ES.host, undefined, 'Elasticsearch host required');

const ES_HOST = CONFIG.ES.host;
const SOME_MINUTES = 1000 * 60 * 10;

export interface IEsService {
  client: any;
  sniff: (timeout?: number) => Promise<boolean>;
  proxy: (req: Request, res: Response) => void;
}

@injectable()
export class ElasticSearchService implements IEsService {
  public client: any;
  public constructor(
    @inject(Logger) private logger: Logger,
    @inject(MailingService) private mailer: MailingService
  ) {
    this.client = new elasticsearch.Client({
      host: ES_HOST,
      log: {
        type: 'file'
      },
      sniffAfterConnectionFault: true,
      requestTimeout: Infinity,
      keepAlive: true
    });

    this.setup();
  }

  private setup() {
    if (
      !CONFIG.ES.sniffRobot ||
      !isObject(CONFIG.ES.sniffRobot) ||
      !CONFIG.ES.sniffRobot.activate
    ) {
      this.logger.debug('Elasticsearch cluster monitoring not enabled');
      return;
    }

    const interval = Math.min((CONFIG.ES.sniffRobot.sniffInterval || SOME_MINUTES) / 1000 * 60, 10);
    const timeout = CONFIG.ES.sniffRobot.sniffTimeOut || SOME_MINUTES;
    const alerting = isObject(CONFIG.ES.sniffRobot.alerting) ? CONFIG.ES.sniffRobot.alerting : {};

    const monitor = () => {
      const ok = this.isUp(timeout);
      if (ok) {
        return;
      }
      this.sendAlert(alerting);
    };

    const INTERVAL = '*/' + interval + ' * * * *';
    cron(interval, monitor);
  }

  private sendAlert(alerting: any) {
    if (!alerting.activate) {
      this.logger.debug('Elasticsearch cluster down. Alerting not activated');
      return;
    }

    this.mailer.send({
      to: alerting.to,
      cc: alerting.cc,
      subject: 'Elasticsearch cluster down',
      text: 'Monitor robot has detected that your Elasticsearch cluster is down',
      html: '<p>Elasticsearch cluster town.</p>'
    });
  }

  private async isUp(timeout) {
    try {
      const isUp = await this.sniff(timeout);
      if (isUp) {
        this.logger.info('Elasticsearch cluster up');
        return true;
      }
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }

  public async sniff(timeout?: number): Promise<any> {
    timeout = Math.max(timeout || 10000, 10000);

    return this.client
      .ping({
        requestTimeout: timeout
      })
      .then(result => {
        return Promise.resolve(result);
      })
      .catch(err => {
        return Promise.reject(err);
      });
  }

  public proxy(req, res): void {
    switch (req.method) {
      case 'PUT':
        return request
          .put(this.opts(req))
          .then(body => {
            res.json(body);
          })
          .catch(err => {
            error(res, err);
          });
      case 'POST':
        request
          .post(this.opts(req))
          .then(body => {
            res.json(body);
          })
          .catch(err => {
            this.logger.error(err);
            error(res, err);
          });
        break;
      case 'PATCH':
        request
          .patch(this.opts(req))
          .then(body => {
            res.json(body);
          })
          .catch(err => {
            this.logger.error(err);
            error(res, err);
          });
        break;
      case 'HEAD':
        request
          .get(this.opts(req))
          .then(body => {
            res.send(body);
          })
          .catch(err => {
            this.logger.error(err);
            error(res, err);
          });
        break;
      case 'OPTIONS':
        request
          .options(this.opts(req))
          .then(body => {
            res.json(body);
          })
          .catch(err => {
            this.logger.error(err);
            error(res, err);
          });
        break;
      case 'DELETE':
        request
          .delete(this.opts(req))
          .then(body => {
            res.json(body);
          })
          .catch(err => {
            this.logger.error(err);
            error(res, err);
          });
        break;
      case 'GET':
        request
          .get(this.opts(req))
          .then(body => {
            res.json(body);
          })
          .catch(err => {
            this.logger.error(err);
            error(res, err);
          });
        break;
      default: {
        error(res, 'Method not supported');
      }
    }
  }

  private opts(req): Object {
    const opts_ = {
      method: req.method.toUpperCase(),
      uri: ES_HOST + req.url.substring(1),
      body: req.body,
      timeout: SOME_MINUTES,
      json: true
    };

    this.logger.debug(JSON.stringify(opts_, null, 1));

    return opts_;
  }
}
