import { injectable, inject } from 'inversify';
import { controller, all, BaseHttpController, request, response } from 'inversify-express-utils';
import { AuthService } from '../services/auth.service';
import { auth, auth_header } from '../utils';
import * as express from 'express';

const authService = inject(AuthService);

@injectable()
@controller('/login', AuthService.authenticate())
export class LoginController extends BaseHttpController {
	@authService private authService: AuthService;

	@all('/')
	public login(@request() req: express.Request, @response() res: express.Response) {
		const user = this.httpContext.user.details;

		delete user[auth];
		delete user.date;
		delete user.__server;

		res.setHeader(
			auth_header,
			user ? this.httpContext.user.details['user'][auth] : req.headers['authorization']
		);
		res.json(user);
	}

	@all('/logout')
	public async logout(@request() req: express.Request, @response() res: express.Response) {
		await this.authService.remove(req['user'][auth]); // remove from session before user logout
		req['logout']();
		res.json({ message: 'Logged out' });
	}
}
