import { inject, injectable } from "inversify";
import { Logger } from "../middleware/logger";
import { ElasticSearchService } from "./elasticsearch.service";
import {User} from '../entities/user';

@injectable()
export class UserService {

    public constructor(@inject(Logger) private logger: Logger, @inject(ElasticSearchService) esService: ElasticSearchService){

    }

    private async setup() {

    }
}