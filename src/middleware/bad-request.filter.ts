import { Logger } from './logger';
import { injectable, inject } from 'inversify';
 
@injectable()
export class BadRequest {
  public constructor(@inject(Logger) private logger: Logger) {}

  public config(app) {
    // catch 404 and forward to error handler
    app.use((req, res, next) => {
      const err = new Error('Not Found');
      err['status'] = 404;
      next(err);
    });

    // error handler
    app.use((err, req, res, next) => {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      res.status(err.status || 500);

      this.logger.error(err.message);

      res.send('Problem occurred');
    });
  }
}
