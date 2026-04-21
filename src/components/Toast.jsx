import { createContext, useCallback, useContext, useState } from 'react';
import Icon from './Icon';

const ToastCtx = createContext({ toast: () => {} });

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);

  const toast = useCallback((msg, kind = 'info', ms = 3200) => {
    const id = Math.random().toString(36).slice(2, 9);
    setList((xs) => [...xs, { id, msg, kind }]);
    setTimeout(() => setList((xs) => xs.filter((t) => t.id !== id)), ms);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="toast-host">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon n={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'alert' : 'info'} size={18} />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx).toast;
}
