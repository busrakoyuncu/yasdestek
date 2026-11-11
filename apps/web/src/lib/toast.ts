import { toast } from 'sonner';
import { errorMessage } from '@/lib/errors';

// The one way a finished action speaks: a short toast, never an alert.
export const toastSuccess = (message: string) => toast.success(message);
export const toastError = (error: unknown) => toast.error(errorMessage(error));
