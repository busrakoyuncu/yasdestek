import { createBrowserRouter } from 'react-router';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { WelcomePage } from '@/features/welcome/WelcomePage';
import { AreaHome } from './AreaHome';

export const router = createBrowserRouter([
  { path: '/', Component: WelcomePage },
  { path: '/login', Component: LoginPage },
  { path: '/change-password', Component: ChangePasswordPage },
  { path: '*', Component: AreaHome },
]);
