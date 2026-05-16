// components/MissingDocsDialog.tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertTriangle, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    open: boolean;
    missingDocs: string[];
    onClose: () => void;
}

export function MissingDocsDialog({ open, missingDocs, onClose }: Props) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className="p-0 max-w-sm overflow-hidden border-0 shadow-2xl rounded-2xl"
                aria-describedby={undefined}
            >
                {/* Olive header */}
                <div className="bg-[#576238] px-6 py-5 flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#FFD95D]/20 border border-[#FFD95D]/30 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-[#FFD95D]" />
                    </div>
                    <div className="pt-0.5">
                        <h2 className="text-sm font-bold text-white tracking-tight">
                            Cannot Complete Stage
                        </h2>
                        <p className="text-xs text-white/60 mt-0.5">
                            Some required documents are missing
                        </p>
                    </div>
                </div>

                {/* Mustard stripe */}
                <div className="h-[3px] bg-[#FFD95D]" />

                {/* Body */}
                <div className="px-6 py-5">
                    <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">
                        Please upload or generate the following documents before marking this stage as complete:
                    </p>

                    {/* Missing docs list */}
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
                        <p className="text-[10px] font-semibold text-red-400 uppercase tracking-widest mb-2.5">
                            Missing Documents
                        </p>
                        <div className="flex flex-col gap-1.5">
                            {missingDocs.map((doc, i) => (
                                <div key={i} className="flex items-center gap-2.5">
                                    <div className="w-5 h-5 rounded-md bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <FileX className="h-3 w-3 text-red-400" />
                                    </div>
                                    <span className="text-[13px] text-red-700 font-medium">{doc}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action */}
                    <div className="flex justify-end">
                        <Button
                            onClick={onClose}
                            className="bg-[#576238] hover:bg-[#464f2d] text-white text-[13px] font-semibold h-9 px-6 rounded-xl"
                        >
                            Got it
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}