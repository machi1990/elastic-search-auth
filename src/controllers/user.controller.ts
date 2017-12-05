import {
	controller,
	requestParam,
	interfaces,
	BaseHttpController,
	httpPost,
	httpDelete,
	httpGet,
	httpPut,
	requestBody
} from 'inversify-express-utils';
import { AuthService } from '../services/auth.service';
import { injectable, inject } from 'inversify';
import { UserService } from '../services/user.service';
import { Logger } from '../middleware/logger';
import * as express from 'express';
import { EncryptionService } from '../services/encryption.service';
import { BAD_REQUEST, FORBIDDEN, CREATED, INTERNAL_SERVER_ERROR } from '../utils';
import { create } from 'domain';

const ADMIN = 'ADMIN';
const pattern = /[^a-zA-Z0-9\.]/;
const userService = inject(UserService);
const logger = inject(Logger);
const authService = inject(AuthService);

@injectable()
@controller('/users', AuthService.authenticate())
export class UserController extends BaseHttpController {
	@userService private userService: UserService;
	@logger private logger: Logger;
	@authService private authService: AuthService;

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
		if (req.url.includes('/change/password')) {
			next();
			return;
		}

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

	@httpGet('/roles/')
	public roles() {
		return this.userService.roles;
	}

	@httpGet('/list/')
	public async list(req: express.Request) {
		return await this.userService.users(req.query);
	}

	@httpGet('/view/:username')
	public async view(@requestParam('username') username: string) {
		return await this.userService.get(username);
	}

	@httpDelete('/delete/:username')
	public async delete(@requestParam('username') username: string) {
		return await this.userService.delete(username);
	}

	@httpPut('/change/password')
	public async changePassword(@requestBody('password') password: string) {
		if (!this.isValidPassword(password)) {
			throw {
				status: BAD_REQUEST,
				message: 'Password must be between 6 to 20 characters'
			};
		}

		const user = {
			username: this.httpContext.user.details['username'],
			password: EncryptionService.encrypt(password)
		};

		return await this.userService.update(user);
	}

	@httpPut('/reinit/password/')
	public async reinitPassword(@requestBody() user: any) {
		if (!user.username) {
			throw {
				status: BAD_REQUEST,
				message: 'Username required'
			};
		}

		if (!this.isValidPassword(user.password)) {
			throw {
				status: BAD_REQUEST,
				message: 'Password must be between 6 to 20 characters'
			};
		}

		return await this.userService.update({
			username: user.username,
			password: EncryptionService.encrypt(user.password)
		});
	}

	@httpPut('/edit/')
	public async edit(@requestBody() user: any) {
		if (!user['username']) {
			throw {
				status: BAD_REQUEST,
				message: 'Username required'
			};
		}

		delete user.password;
		return await this.userService.update(user);
	}

	@httpPost('/create/')
	public async create(@requestBody() user: any) {
		if (!user.username) {
			throw {
				status: BAD_REQUEST,
				message: 'Missing username'
			};
		}

		const loginLen = user.username.length;

		if (loginLen < 3 || loginLen > 20) {
			throw {
				status: BAD_REQUEST,
				message: 'Username must be between 3 to 20 characters.'
			};
		}

		if (pattern.test(user.username)) {
			throw {
				status: BAD_REQUEST,
				message: 'Username invalid: Only alphanumeric characters allowed.'
			};
		}

		if (!user.password) {
			throw {
				status: BAD_REQUEST,
				message: 'Missing password'
			};
		}

		if (!this.isValidPassword(user.password)) {
			throw {
				status: BAD_REQUEST,
				message: 'Password must be between 6 to 20 characters'
			};
		}

		try {
			return await this.userService.create(user);
		} catch (e) {
			throw {
				status: INTERNAL_SERVER_ERROR,
				message: 'User not created'
			};
		}
	}

	private isValidPassword(password) {
		const pwdLength = password.length;
		return pwdLength >= 6 && pwdLength <= 30;
	}
}
