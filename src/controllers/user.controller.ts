import { injectable } from 'inversify';
import { controller, BaseHttpController } from 'inversify-express-utils';
import { AuthService } from '../services/auth.service';

@injectable()
@controller('/users/', AuthService.authenticate())
export class UserController extends BaseHttpController {}
