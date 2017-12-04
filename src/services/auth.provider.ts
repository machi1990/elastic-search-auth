import { injectable, inject } from 'inversify';
import { interfaces } from 'inversify-express-utils';
import * as express from 'express';
import { AuthService } from './auth.service';

export class Principal implements interfaces.Principal {
	public details: any;
	public constrcutor(details: any) {
		this.details = details;
	}
	public isAuthenticated(): Promise<boolean> {
		return Promise.resolve(true);
	}
	public isResourceOwner(resourceId: any): Promise<boolean> {
		return Promise.resolve(false);
	}
	public isInRole(role: string): Promise<boolean> {
		return Promise.resolve(role === this.details.role);
	}
}

const authService = inject(AuthService);

@injectable()
export class AuthProvider implements interfaces.AuthProvider {
	@authService private readonly authService: AuthService;

	public async getUser(
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	): Promise<interfaces.Principal> {
		const principal = new Principal();
		principal.details = req['user'];
		return principal;
	}
}
