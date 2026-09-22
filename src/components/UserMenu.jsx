import { useEffect, useRef, useState } from 'react';
import motifitLogo from '../assets/motifit-logo.png';

export default function UserMenu() {
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setMenuOpen(false);
    window.location.href = '/login';
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-amber-500/45 bg-slate-900/90 shadow-[0_0_24px_rgba(245,158,11,0.22)] transition hover:scale-[1.02] hover:border-amber-400 sm:h-[4.5rem] sm:w-[4.5rem]"
        aria-label="Profile menu"
        aria-expanded={menuOpen}
      >
        <img src={motifitLogo} alt="MotiFit logo" className="h-full w-full object-cover" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-999 mt-2 w-48 rounded-2xl border border-neutral-700 bg-neutral-900 p-2 shadow-2xl">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl px-4 py-2.5 text-left text-xs font-bold text-red-500 transition-all hover:bg-red-500/20 hover:text-red-400"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
