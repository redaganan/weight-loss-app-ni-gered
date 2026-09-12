import { NavLink, Outlet } from 'react-router-dom';
import { UserCircle2 } from 'lucide-react';

const navItems = [
  { label: 'SETUP', to: '/' },
  { label: 'MY PLAN', to: '/my-plan' },
  { label: 'FOOD SCAN', to: '/food-scan' },
  { label: 'WORKOUTS', to: '/workouts' },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-300 shadow-lg shadow-amber-500/30">
              <span className="text-lg font-black tracking-tight text-slate-950">W</span>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-xl px-4 py-2.5 text-[10px] font-semibold tracking-[0.18em] text-slate-300 transition-all',
                    'hover:bg-slate-800 hover:text-white',
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20'
                      : '',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <button
            type="button"
            aria-label="User profile"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 shadow-lg shadow-slate-950/50 transition-all hover:border-amber-500/60 hover:text-white"
          >
            <UserCircle2 className="h-6 w-6" />
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
