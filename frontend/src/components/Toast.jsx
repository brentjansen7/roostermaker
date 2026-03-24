import { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

let toastFunctie = null;

export function toonToast(bericht, type = 'info') {
  if (toastFunctie) toastFunctie(bericht, type);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastFunctie = (bericht, type) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, bericht, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    return () => { toastFunctie = null; };
  }, []);

  const kleuren = {
    succes: 'bg-green-500',
    fout: 'bg-red-500',
    info: 'bg-blue-500',
    waarschuwing: 'bg-yellow-500',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <div key={toast.id} className={`${kleuren[toast.type] || kleuren.info} text-white px-4 py-3 rounded-lg shadow-lg max-w-sm text-sm`}>
          {toast.bericht}
        </div>
      ))}
    </div>
  );
}
