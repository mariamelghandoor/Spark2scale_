// 1. types (at top of file or separate types.ts)
type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
    id: string;
    type: ToastType;
    title: string;
    message: string;
}

// 2. Config constant (outside any component)
const TOAST_CONFIG: Record<ToastType, {
    border: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
}> = {
    success: {
        border: "border-l-[#639922]",
        iconBg: "bg-[#EAF3DE]",
        iconColor: "text-[#3B6D11]",
        titleColor: "text-[#27500A]",
    },
    error: {
        border: "border-l-[#E24B4A]",
        iconBg: "bg-[#FCEBEB]",
        iconColor: "text-[#A32D2D]",
        titleColor: "text-[#791F1F]",
    },
    warning: {
        border: "border-l-[#BA7517]",
        iconBg: "bg-[#FAEEDA]",
        iconColor: "text-[#854F0B]",
        titleColor: "text-[#633806]",
    },
    info: {
        border: "border-l-[#576238]",
        iconBg: "bg-[#F0EADC]",
        iconColor: "text-[#576238]",
        titleColor: "text-[#576238]",
    },
};

// 3. Standalone ToastContainer component (outside DocumentsPage, outside useToast)
function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
    return (
        <div className= "fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none" >
        <AnimatePresence>
        {
            toasts.map((t) => {
                const cfg = TOAST_CONFIG[t.type];
                const iconMap: Record<ToastType, React.ReactNode> = {
                    error: <XCircle className={`h-4 w-4 ${cfg.iconColor}`
            } />,
            success: <CheckCircle2 className={`h-4 w-4 ${cfg.iconColor}`} />,
        warning: <AlertTriangle className={ `h-4 w-4 ${cfg.iconColor}` } />,
    info: <Info className={ `h-4 w-4 ${cfg.iconColor}` } />,
};
return (
    <motion.div
              key= { t.id }
initial = {{ x: 120, opacity: 0 }}
animate = {{ x: 0, opacity: 1 }}
exit = {{ x: 120, opacity: 0 }}
transition = {{ type: "spring", stiffness: 300, damping: 25 }}
className = {`pointer-events-auto flex items-start gap-3 bg-white rounded-xl px-4 py-3.5 min-w-[300px] max-w-[380px] shadow-xl border border-gray-100 border-l-4 ${cfg.border}`}
            >
    <div className={ `flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.iconBg}` }>
        { iconMap[t.type]}
        </div>
        < div className = "flex-1 min-w-0" >
            <p className={ `text-[13px] font-semibold ${cfg.titleColor}` }> { t.title } </p>
                < p className = "text-[12px] text-gray-500 leading-relaxed mt-0.5" > { t.message } </p>
                    </div>
                    < button
onClick = {() => onDismiss(t.id)}
className = "text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
    >
    <X className="h-3.5 w-3.5" />
        </button>
        </motion.div>
          );
        })}
</AnimatePresence>
    </div>
  );
}

// 4. Clean hook — only state + function, NO JSX
function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const toast = useCallback((type: ToastType, title: string, message: string, duration = 5000) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toast, toasts, dismissToast };
}