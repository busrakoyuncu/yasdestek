import { createBrowserRouter } from 'react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { AreaHome } from './AreaHome';

export const router = createBrowserRouter([
  { path: '/login', Component: LoginPage },
  { path: '*', Component: AreaHome },
]);
