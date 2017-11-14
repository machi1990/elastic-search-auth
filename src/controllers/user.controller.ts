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
        status: 403,
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
        status: 403,
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
        status: 403,
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
    const pwdLen = password.length;
    if (pwdLen < 6 || pwdLen > 30) {
      throw {
        status: 400,
        message: 'Password must be between 6 to 20 characters'
      };
    }

    const user = {
      username: this.httpContext.user.details['username'],
      password: EncryptionService.encrypt(password)
    };

    return await this.userService.update(user);
  }

  @httpPut('/edit/')
  public async edit(@requestBody() user: any) {
    if (!user['username']) {
      throw {
        status: 400,
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
        status: 400,
        message: 'Missing username'
      };
    }

    const loginLen = user.username.length;

    if (loginLen < 3 || loginLen > 20) {
      throw {
        status: 400,
        message: 'Username must be between 3 to 20 characters.'
      };
    }

    if (pattern.test(user.username)) {
      throw {
        status: 400,
        message: 'Username invalid: Only alphanumeric characters allowed.'
      };
    }

    if (!user.password) {
      throw {
        status: 400,
        message: 'Missing password'
      };
    }

    const pwdLen = user.password.length;

    if (pwdLen < 6 || pwdLen > 30) {
      throw {
        status: 400,
        message: 'Password must be between 6 to 20 characters'
      };
    }

    return await this.userService.create(user);
  }
}
