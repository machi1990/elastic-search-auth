import * as elasticsearch from 'elasticsearch';
import * as process from 'process';
import * as assert from 'assert';
import * as request from 'request-promise';
import * as express from 'express';
import * as CONFIG from '../config';
import { isObject, cron, auth_header, auth, NOT_IMPLEMENTED } from '../utils';
import { inject, injectable } from 'inversify';
import { Logger } from '../middleware/logger';
import { MailingService } from './mailing.service';

assert.notEqual(CONFIG.ES, undefined, 'Elasticsearch opts required');
assert.equal(true, isObject(CONFIG.ES), 'Elasticsearch config must be an object');
assert.notEqual(CONFIG.ES.host, undefined, 'Elasticsearch host required');

const ES_HOST = CONFIG.ES.host;
const SOME_MINUTES = 1000 * 60 * 10;

export interface IEsService {
	client: any;
	sniff: (timeout?: number) => Promise<boolean>;
	proxy: (req: express.Request, res: express.Response) => void;
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

		return await this.client.ping({
			requestTimeout: timeout
		});
	}

	public proxy(req: express.Request, res: express.Response): void {
		let proxyResponse: Promise<any>;

		switch (req.method) {
			case 'PUT':
				proxyResponse = request.put(this.opts(req));
			case 'POST':
				proxyResponse = request.post(this.opts(req));
				break;
			case 'PATCH':
				proxyResponse = request.patch(this.opts(req));
				break;
			case 'HEAD':
				proxyResponse = request.get(this.opts(req));
				break;
			case 'OPTIONS':
				proxyResponse = request.options(this.opts(req));
				break;
			case 'DELETE':
				proxyResponse = request.delete(this.opts(req));
				break;
			case 'GET':
				proxyResponse = request.get(this.opts(req));
				break;
			default: {
				throw {
					status: NOT_IMPLEMENTED,
					message: 'Method not supported'
				};
			}
		}

		proxyResponse
			.then(this.onProxyResponse.bind(null, req, res, true))
			.catch(this.onProxyResponse.bind(null, req, res, false));
	}

	private onProxyResponse(
		req: express.Request,
		res: express.Response,
		okay: boolean,
		proxyResponse: any
	) {
		const headers = okay ? proxyResponse.headers : proxyResponse.response.headers;
		for (const header in headers) {
			res.setHeader(header, headers[header]);
		}
		res.setHeader(auth_header, req['user'] ? req['user'][auth] : req.headers['authorization']);
		res.status(proxyResponse.statusCode).send(okay ? proxyResponse.body : proxyResponse.message);
	}

	private opts(req: express.Request): Object {
		const headers = Object.assign({}, req.headers);
		delete headers['authorization'];
		delete headers['accept-encoding'];
		const json = !headers['content-type']
			? true
			: headers['content-type'].indexOf('application/json') !== -1;

		const opts = {
			resolveWithFullResponse: true,
			method: req.method.toUpperCase(),
			uri: ES_HOST + req.url.substring(3),
			body: req.body,
			timeout: SOME_MINUTES,
			headers: headers,
			json: json
		};

		this.logger.debug(JSON.stringify(opts, null, 1));

		return opts;
	}
}
