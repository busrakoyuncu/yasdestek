import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
// Skips the session guard. Only for login.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ALLOW_PASSWORD_CHANGE_PENDING_KEY = 'allowPasswordChangePending';
// Lets a user who still has to change their password reach this route
// (change-password itself, logout, me). Everything else answers 403.
export const AllowPasswordChangePending = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_PENDING_KEY, true);
