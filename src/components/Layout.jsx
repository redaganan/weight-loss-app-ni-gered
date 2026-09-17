import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="relative flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[#070707] font-sans text-neutral-100 bg-aura-glow">
      <div className="pointer-events-none absolute -top-32 -left-32 h-150 w-150 rounded-full bg-amber-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute top-1/2 -right-40 h-125 w-125 rounded-full bg-yellow-500/5 blur-[160px]" />

      <Header />

      <main className="relative z-0 mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}