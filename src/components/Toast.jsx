import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const value = useMemo(() => ({ notify, dismiss }), [dismiss, notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[2000] flex flex-col items-end gap-3 sm:left-auto sm:w-96">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const Icon = isSuccess ? CheckCircle2 : isError ? XCircle : Info;
          const color = isSuccess ? 'text-amber-300' : isError ? 'text-red-300' : 'text-slate-300';

          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 text-sm text-slate-100 shadow-2xl backdrop-blur-xl"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
              <span className="flex-1">{toast.message}</span>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" className="text-slate-500 transition hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
