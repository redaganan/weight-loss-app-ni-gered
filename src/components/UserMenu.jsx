import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UserMenu() {
  const navigate = useNavigate();
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
        className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/35 bg-slate-900/90 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.18)] transition hover:scale-[1.02] hover:border-amber-400"
        aria-label="Profile menu"
        aria-expanded={menuOpen}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-yellow-300 font-bold text-slate-950">
          U
        </span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-999 mt-2 w-48 rounded-2xl border border-neutral-700 bg-neutral-900 p-2 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              navigate('/profile');
            }}
            className="w-full rounded-xl px-4 py-2.5 text-left text-xs font-semibold text-neutral-100 transition-all hover:bg-neutral-800"
          >
            Edit Profile &amp; Plan
          </button>
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
