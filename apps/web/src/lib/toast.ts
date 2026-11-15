import { toast } from 'sonner';
import { errorMessage } from '@/lib/errors';

// The one way a finished action speaks: a short toast, never an alert.
export const toastSuccess = (message: string) => toast.success(message);
export const toastError = (error: unknown) => toast.error(errorMessage(error));
// For a refusal decided on the client, already worded.
export const toastFailure = (message: string) => toast.error(message);
