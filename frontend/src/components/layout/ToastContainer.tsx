import { useToastStore } from '../../store/toast';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-teal-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  info: <Info className="w-5 h-5 text-bone-300" />,
};

const bgColors = {
  success: 'bg-physio-navy border-teal-500/30 text-teal-300',
  error: 'bg-physio-navy border-red-500/30 text-red-300',
  warning: 'bg-physio-navy border-amber-500/30 text-amber-300',
  info: 'bg-physio-navy border-teal-500/10 text-bone-200',
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-slide-in ${bgColors[toast.type]}`}
        >
          <div className="shrink-0">{icons[toast.type]}</div>
          <div className="flex-1 text-[0.8rem] font-medium leading-5">{toast.message}</div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-bone-600/40 hover:text-bone-300/80 transition-colors p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
