import { RouterProvider } from 'react-router-dom';

import { router } from './router';
import { ProfileProvider } from './contexts/ProfileContext';
import { ToastProvider } from './contexts/ToastContext';
import { LayerProvider } from './contexts/LayerContext';

export default function App() {
  return (
    <ToastProvider>
      <ProfileProvider>
        <LayerProvider>
          <RouterProvider router={router} />
        </LayerProvider>
      </ProfileProvider>
    </ToastProvider>
  );
}
