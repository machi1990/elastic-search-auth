import { injectable, inject } from 'inversify';
import { controller, BaseHttpController } from 'inversify-express-utils';
import * as passport from 'passport';
import { AuthService } from '../services/auth.service';

@injectable()
@controller('/configurations/', AuthService.authenticate())
export class ConfigurationContoller extends BaseHttpController {}
