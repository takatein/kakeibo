import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="min-h-screen max-w-lg mx-auto relative">
      <main className="pb-20 safe-area-top">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
