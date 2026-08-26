import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 flex flex-col">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

