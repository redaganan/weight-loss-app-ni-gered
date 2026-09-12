import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const tabs = [
    { name: 'Overview', path: '/' },
    { name: 'Workouts', path: '/workouts' },
    { name: 'Meals', path: '/meals' },
    { name: 'Planner', path: '/planner' },
    { name: 'History', path: '/history' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const closeMobileNav = () => setMobileNavOpen(false);
    window.addEventListener('resize', closeMobileNav);
    return () => window.removeEventListener('resize', closeMobileNav);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setMenuOpen(false);
    window.location.href = '/login';
  };

  const handleEditPlan = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  const handleNavClick = () => {
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#070707] text-neutral-100 font-sans relative bg-aura-glow">
      <div className="pointer-events-none absolute -top-32 -left-32 h-150 w-150 rounded-full bg-amber-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute top-1/2 -right-40 h-125 w-125 rounded-full bg-yellow-500/5 blur-[160px]" />

      <header className="relative z-100 mx-auto flex max-w-7xl items-center justify-between px-4 pt-5 sm:px-6 sm:pt-6">
        <div className="w-10" />

        <nav className="hidden items-center gap-2 rounded-full border border-neutral-800/80 bg-neutral-900/80 p-1.5 shadow-[0_0_24px_rgba(245,158,11,0.15)] backdrop-blur-md md:flex">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-linear-to-r from-amber-400 to-yellow-300 text-black shadow-lg shadow-amber-500/25'
                    : 'text-neutral-400 hover:text-white'
                }`
              }
            >
              {tab.name}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900/90 text-neutral-300 transition hover:border-amber-400 hover:text-amber-300 md:hidden"
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/35 bg-slate-900/90 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.18)] transition hover:scale-[1.02] hover:border-amber-400"
            aria-label="Profile menu"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-yellow-300 font-bold text-slate-950">
              U
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-999 mt-2 w-48 rounded-2xl border border-neutral-700 bg-neutral-900 p-2 shadow-2xl">
              <button
                type="button"
                onClick={handleEditPlan}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-neutral-100 hover:bg-neutral-800 rounded-xl transition-all"
              >
                Edit Profile & Plan
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
              >
                Logout
              </button>
            </div>
          )}
          </div>
        </div>

        {mobileNavOpen && (
          <nav className="absolute left-4 right-4 top-full mt-3 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl md:hidden">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-linear-to-r from-amber-400 to-yellow-300 text-black'
                      : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                  }`
                }
              >
                {tab.name}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="relative z-0 mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}