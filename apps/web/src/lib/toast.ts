import { toast } from 'vue-sonner';
import { errorMessage } from '@/lib/errors';
import { i18n } from '@/lib/i18n';

// Failed actions: a toast with a human message. Loads use inline error states instead.
export const toastError = (error: unknown) => toast.error(errorMessage(error));
export const toastSuccess = (key: string) => toast.success(i18n.global.t(key));
