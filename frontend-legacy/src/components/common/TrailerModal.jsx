/**
 * Trailer viewing modal.
 * Rendered on body using React Portal.
 */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";

export default function TrailerModal({ isOpen, onClose, trailerKey }) {
    useEffect(() => {
        if (isOpen) {
            // Get scrollbar width to prevent "jump"
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            
            // Lock body scroll
            document.body.style.overflowY = "hidden";
            document.body.style.overflowX = "hidden";
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }

            const handleEsc = (e) => {
                if (e.key === "Escape") onClose();
            };
            window.addEventListener("keydown", handleEsc);

            return () => {
                // Reset body scroll
                document.body.style.removeProperty("overflow-y");
                document.body.style.removeProperty("overflow-x");
                document.body.style.removeProperty("padding-right");
                window.removeEventListener("keydown", handleEsc);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 animate-fade-in"
        >
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose} />

            <button
                onClick={onClose}
                className="fixed top-6 right-6 md:top-10 md:right-10 text-white/50 hover:text-white transition-all hover:scale-110 active:scale-95 z-[10000] p-3 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md border border-white/10 group"
                title="Kapat (ESC)"
            >
                <X size={28} strokeWidth={2.5} />
            </button>

            <div
                className="relative w-full max-w-6xl aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] border border-white/10 z-10"
                onClick={(e) => e.stopPropagation()}
            >

                {trailerKey ? (
                    <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${trailerKey}?rel=0&modestbranding=1`}
                        title="Trailer"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary gap-4">
                        <ChevronLeft size={64} strokeWidth={1} className="opacity-20" />
                        <p className="font-bold">Üzgünüz, bu içerik için fragman bulunamadı.</p>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
