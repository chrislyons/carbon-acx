import { RouterProvider } from 'react-router-dom';

import { router } from './router';
import { ProfileProvider } from './contexts/ProfileContext';
import { ToastProvider } from './contexts/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <ProfileProvider>
        <RouterProvider router={router} />
      </ProfileProvider>
    </ToastProvider>
  );
}
