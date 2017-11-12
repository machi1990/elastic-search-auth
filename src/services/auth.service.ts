import { injectable } from 'inversify';
import * as passport from 'passport';

@injectable()
export class AuthService {
  public static readonly TYPE = '';

  public static authenticate() {
    return passport.authenticate(AuthService.TYPE);
  }
}
