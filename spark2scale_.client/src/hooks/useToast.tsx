import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, XCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import React from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
    id: string;
    type: ToastType;
    title: string;
    message: string;
}

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

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
    return (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
            <AnimatePresence>
                {toasts.map((t) => {
                    const cfg = TOAST_CONFIG[t.type];
                    const iconMap: Record<ToastType, React.ReactNode> = {
                        success: <CheckCircle2 className={`w-5 h-5 ${cfg.iconColor}`} />,
                        error: <XCircle className={`w-5 h-5 ${cfg.iconColor}`} />,
                        warning: <AlertTriangle className={`w-5 h-5 ${cfg.iconColor}`} />,
                        info: <Info className={`w-5 h-5 ${cfg.iconColor}`} />,
                    };

                    return (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            className={`pointer-events-auto flex items-start gap-3 bg-white border border-[#d4cbb8]/40 border-l-4 ${cfg.border} rounded-xl p-4 shadow-lg min-w-[320px] max-w-[400px]`}
                        >
                            <div className={`p-1.5 rounded-lg ${cfg.iconBg}`}>
                                {iconMap[t.type]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-bold ${cfg.titleColor} truncate`}>{t.title}</h4>
                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t.message}</p>
                            </div>
                            <button
                                onClick={() => onDismiss(t.id)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

export function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const toast = useCallback((type: ToastType, title: string, message: string, duration = 5000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, title, message }]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toast, toasts, dismissToast };
}
