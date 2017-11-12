import { injectable } from "inversify";
import { controller, BaseHttpController } from "inversify-express-utils";

@injectable()
@controller('/users/')
export class UserController extends BaseHttpController {

}