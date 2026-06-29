import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

export default function AuthModal({ onClose }) {
    const navigate = useNavigate();

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div 
                className="bg-bg-surface w-full max-w-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white">Oturum Açman Gerekiyor</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-text-secondary hover:text-white hover:bg-white/5 rounded-full transition-all cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-8 text-center">
                    <p className="text-text-secondary text-base leading-relaxed">
                        Liste oluşturabilmek için oturum açmalısın. Kendi koleksiyonlarını oluşturmak ve paylaşmak çok kolay!
                    </p>
                </div>

                <div className="p-6 bg-black/20 flex flex-col gap-3">
                    <button
                        onClick={() => {
                            navigate("/login");
                            onClose();
                        }}
                        className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-brand/20 cursor-pointer"
                    >
                        Oturum aç
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer"
                    >
                        İptal
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
