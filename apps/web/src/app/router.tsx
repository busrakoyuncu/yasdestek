import { createBrowserRouter } from 'react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { WelcomePage } from '@/features/welcome/WelcomePage';
import { AreaHome } from './AreaHome';

export const router = createBrowserRouter([
  { path: '/', Component: WelcomePage },
  { path: '/login', Component: LoginPage },
  { path: '*', Component: AreaHome },
]);
