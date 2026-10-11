import { SetMetadata } from '@nestjs/common';
import { Role } from '../generated/prisma/client';

export const ROLES_KEY = 'roles';

// Restricts a controller or handler to the given roles. Checked by RolesGuard.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
