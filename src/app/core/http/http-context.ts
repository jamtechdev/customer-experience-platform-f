import { HttpContextToken } from '@angular/common/http';

/** When true, the global error interceptor will not show a toastr for this request. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);
