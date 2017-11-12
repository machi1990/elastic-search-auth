import { injectable, inject } from "inversify";
import { controller, BaseHttpController } from "inversify-express-utils";

@injectable()
@controller('/configurations/')
export class ConfigurationContoller extends BaseHttpController{

}