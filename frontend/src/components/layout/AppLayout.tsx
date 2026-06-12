import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Table2,
  Mail,
  Calendar,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: 'dashboard', label: 'Վահանակ', icon: LayoutDashboard },
  { to: 'guests', label: 'Հյուրեր', icon: Users },
  { to: 'expenses', label: 'Ծախսեր', icon: Wallet },
  { to: 'tables', label: 'Սեղաններ', icon: Table2 },
  { to: 'invitations', label: 'Հրավերներ', icon: Mail },
  { to: 'schedule', label: 'Ժամանակացույց', icon: Calendar },
  { to: 'settings', label: 'Կարգավորումներ', icon: Settings },
];

export function AppLayout() {
  const { projectId } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="px-5 py-5 border-b border-stone-100">
        <h1 className="text-sm font-medium text-stone-900">Հարսանիքի Պլանավորող</h1>
        <p className="text-xs text-stone-400 mt-0.5">Wedding Planner</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={`/projects/${projectId}/${to}`}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-stone-100 text-stone-900 font-medium'
                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-stone-100 space-y-0.5">
        <button
          onClick={() => navigate('/projects')}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-stone-600 hover:bg-stone-50"
        >
          ← Նախագծեր
        </button>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-stone-600 hover:bg-stone-50"
        >
          <LogOut size={16} />
          Ելք
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-stone-50">
      <aside className="hidden lg:flex lg:w-56 lg:flex-col bg-white border-r border-stone-200 fixed inset-y-0 left-0">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-stone-900/20" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col border-r border-stone-200">
            <NavContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-56">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-md hover:bg-stone-100">
            <Menu size={20} className="text-stone-700" />
          </button>
          <span className="text-sm font-medium text-stone-900">Հարսանիքի Պլանավորող</span>
          <div className="w-9" />
        </header>
        <main className="p-4 md:p-6 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
