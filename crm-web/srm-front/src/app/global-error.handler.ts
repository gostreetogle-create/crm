import { ErrorHandler, Injectable } from '@angular/core';
import { logAppError } from '@srm/platform-core';

@Injectable()
export class SrmGlobalErrorHandler extends ErrorHandler {
  override handleError(error: unknown): void {
    logAppError('srm-front', 'Unhandled error', error);
  }
}
