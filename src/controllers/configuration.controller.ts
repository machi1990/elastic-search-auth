import { injectable, inject } from 'inversify';
import * as passport from 'passport';
import { AuthService } from '../services/auth.service';
import { ConfigurationService } from '../services/configuration.service';
import { Logger } from '../middleware/logger';
import * as express from 'express';
import { BAD_REQUEST, CREATED, FORBIDDEN } from '../utils';

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
	public delete(@requestParam('key') key: string, res: express.Response) {
		if (this.configService.key === key) {
			res.status(BAD_REQUEST).send('Not allowed');
			return;
		}

		const deleted = this.configService.delete(key);
		if (deleted) res.send(deleted);
		else res.status(BAD_REQUEST).send(deleted);
	}

	@httpPut('/edit/')
	public edit(@requestBody() configuration: any, res: express.Response) {
		if (!configuration || !configuration.key) {
			res.status(BAD_REQUEST).send('Malformed');
			return;
		}

		const updated = this.configService.update(configuration);
		if (updated) res.json(updated);
		else res.status(BAD_REQUEST).send(updated);
	}

	@httpPost('/create/')
	public create(@requestBody() configuration: any, res: express.Response) {
		if (!configuration || !configuration.key) {
			res.status(BAD_REQUEST).send('Malformed');
			return;
		}

		const created = this.configService.create(configuration.key, configuration.value);
		if (created) res.status(CREATED).json(created);
		else res.status(BAD_REQUEST).send(created);
	}
}
