import { injectable, inject } from 'inversify';
import { controller, all, BaseHttpController } from 'inversify-express-utils';
import { AuthService, auth, auth_header } from '../services/auth.service';
import * as express from 'express';

const authService = inject(AuthService);

@injectable()
@controller('/login/', AuthService.authenticate())
export class LoginController extends BaseHttpController {
  @authService private authService: AuthService;

  @all('/')
  public login(req: express.Request, res: express.Response) {
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
  public logout(req: express.Request, res: express.Response) {
    this.authService.remove(req['user'][auth]); // remove from session before user logout
    req['logout']();
    res.json({ message: 'Logged out' });
  }
}
