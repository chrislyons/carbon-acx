import { RouterProvider } from 'react-router-dom';

import { router } from './router';
import { ProfileProvider } from './contexts/ProfileContext';

export default function App() {
  return (
    <ProfileProvider>
      <RouterProvider router={router} />
    </ProfileProvider>
  );
}
