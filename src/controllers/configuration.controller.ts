import { injectable, inject } from 'inversify';
import * as passport from 'passport';
import { AuthService } from '../services/auth.service';
import { ConfigurationService } from '../services/configuration.service';
import { Logger } from '../middleware/logger';
import * as express from 'express';
import { BAD_REQUEST, CREATED, FORBIDDEN, INTERNAL_SERVER_ERROR } from '../utils';

import {
	controller,
	BaseHttpController,
	httpPost,
	httpPut,
	httpDelete,
	interfaces,
	httpGet,
	requestParam,
	requestBody,
	queryParam
} from 'inversify-express-utils';

const configService = inject(ConfigurationService);
const logger = inject(Logger);
const ADMIN = 'ADMIN';

@injectable()
@controller('/configurations', AuthService.authenticate())
export class ConfigurationContoller extends BaseHttpController {
	@configService private readonly configService: ConfigurationService;
	@logger private readonly logger: Logger;

	@httpPost('*')
	public allPost(req: express.Request, res: express.Response, next: express.NextFunction) {
		const principal: interfaces.Principal = this.httpContext.user;
		if (principal.isInRole(ADMIN)) {
			next();
		} else {
			throw {
				status: FORBIDDEN,
				message: 'Not allowed. You do not have the reight access'
			};
		}
	}

	@httpPut('*')
	public allPut(req: express.Request, res: express.Response, next: express.NextFunction) {
		const principal: interfaces.Principal = this.httpContext.user;
		if (principal.isInRole(ADMIN)) {
			next();
		} else {
			throw {
				status: FORBIDDEN,
				message: 'Not allowed. You do not have the reight access'
			};
		}
	}

	@httpDelete('*')
	public allDelete(req: express.Request, res: express.Response, next: express.NextFunction) {
		const principal: interfaces.Principal = this.httpContext.user;
		if (principal.isInRole(ADMIN)) {
			next();
		} else {
			throw {
				status: FORBIDDEN,
				message: 'Not allowed. You do not have the reight access'
			};
		}
	}

	@httpGet('/list/')
	public list(@queryParam('from') from: number, @queryParam('size') size: number) {
		return this.configService.list({
			from: from,
			size: size
		});
	}

	@httpGet('/view/:key')
	public view(@requestParam('key') key: string) {
		return this.configService.get(key);
	}

	@httpDelete('/delete/:key')
	public async delete(@requestParam('key') key: string, response: express.Response) {
		if (this.configService.key === key) {
			response.status(BAD_REQUEST).send('Not allowed');
			return;
		}

		return await this.configService.delete(key);
	}

	@httpPut('/edit/')
	public async edit(@requestBody() configuration: any, res: express.Response) {
		if (!configuration || !configuration.key) {
			res.status(BAD_REQUEST).send('Malformed');
			return;
		}

		return await this.configService.update(configuration);
	}

	@httpPost('/create/')
	public async create(@requestBody() configuration: any, response: express.Response) {
		if (!configuration || !configuration.key) {
			response.status(BAD_REQUEST).send('Malformed');
			return;
		}

		try {
			const created = await this.configService.create(configuration.key, configuration.value);
			response.sendStatus(CREATED);
		} catch (error) {
			throw {
				status: INTERNAL_SERVER_ERROR,
				message: 'Configuration not created'
			};
		}
	}
}
