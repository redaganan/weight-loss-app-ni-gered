import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import UserMenu from './UserMenu';

const tabs = [
  { name: 'Dashboard', path: '/plan' },
  { name: 'Workouts', path: '/workouts' },
  { name: 'Meals', path: '/meals' },
  { name: 'Planner', path: '/planner' },
  { name: 'History', path: '/history' },
];

export default function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const closeMobileNav = () => setMobileNavOpen(false);
    window.addEventListener('resize', closeMobileNav);
    return () => window.removeEventListener('resize', closeMobileNav);
  }, []);

  return (
    <header className="relative z-100 mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 pt-5 sm:px-6 sm:pt-6">
      <div className="justify-self-start">
        <UserMenu />
      </div>

      <nav className="hidden items-center gap-2 rounded-full border border-neutral-800/80 bg-neutral-900/80 p-1.5 shadow-[0_0_24px_rgba(245,158,11,0.15)] backdrop-blur-md md:flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) => {
              const dashboardActive = tab.name === 'Dashboard'
                && (location.pathname === '/' || location.pathname === '/plan');
              const active = dashboardActive || isActive;
              return (
              `rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 ${
                active
                  ? 'bg-linear-to-r from-amber-400 to-yellow-300 text-black shadow-lg shadow-amber-500/25'
                  : 'text-neutral-400 hover:text-white'
              }`
              );
            }}
          >
            {tab.name}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center justify-self-end gap-2">
        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/90 text-neutral-300 transition hover:border-amber-400 hover:text-amber-300 md:hidden"
          aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileNavOpen}
        >
          {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileNavOpen && (
        <nav className="absolute left-4 right-4 top-full mt-3 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl md:hidden">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) => {
                const dashboardActive = tab.name === 'Dashboard'
                  && (location.pathname === '/' || location.pathname === '/plan');
                const active = dashboardActive || isActive;
                return (
                `block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? 'bg-linear-to-r from-amber-400 to-yellow-300 text-black'
                    : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                }`
                );
              }}
            >
              {tab.name}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
