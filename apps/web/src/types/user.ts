export type Role = 'ADMIN' | 'PSYCHOLOGIST' | 'USER';

// What /auth/me and /auth/login return: the User row minus the password hash.
export type CurrentUser = {
  id: string;
  role: Role;
  username: string;
  active: boolean;
  mustChangePassword: boolean;
  psychologistId: string | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
};
