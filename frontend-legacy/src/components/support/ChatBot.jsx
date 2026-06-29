import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { supportApi } from "../../api";
import { BRAND_NAME } from "../../constants";

function TypewriterText({ text, speed = 10 }) {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        if (!text || typeof text !== 'string') return;

        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText((prev) => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);

    return <>{displayedText}</>;
}

export default function ChatBot() {
    const { t } = useLanguage();
    const [messages, setMessages] = useState([
        { role: "assistant", content: t("staticPages.help.botWelcome") || `Merhaba! Ben ${BRAND_NAME} asistanıyım. Size nasıl yardımcı olabilirim?`, isNew: false }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollContainerRef = useRef(null);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput("");

        const newMessages = [...messages, { role: "user", content: userMessage }];
        setMessages(newMessages);
        setLoading(true);

        try {
            const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
            const data = await supportApi.getChatResponse(userMessage, history);

            setMessages([...newMessages, { role: "assistant", content: data.response, isNew: true }]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages([...newMessages, {
                role: "assistant",
                content: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
                isNew: true
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-bg-surface border border-bg-surface-hover rounded-3xl overflow-hidden flex flex-col h-[550px] shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-bg-surface-hover flex items-center gap-3 bg-bg-surface-hover/20">
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <Bot className="text-brand w-7 h-7" />
                </div>
                <div>
                    <h3 className="text-white font-black text-sm tracking-tight">{t("staticPages.help.botTitle")}</h3>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-bg-surface-hover scroll-smooth"
            >
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-bg-surface-hover rounded-full" : ""
                            }`}>
                            {msg.role === "user" ? <User className="w-5 h-5 text-text-secondary" /> : <Bot className="w-6 h-6 text-brand" />}
                        </div>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === "user"
                                ? "bg-brand text-white rounded-tr-none font-medium"
                                : "bg-bg-base text-text-secondary border border-bg-surface-hover rounded-tl-none whitespace-pre-wrap"
                            }`}>
                            {msg.role === "assistant" && msg.isNew ? (
                                <TypewriterText text={msg.content} speed={7} />
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            <Bot className="w-6 h-6 text-brand" />
                        </div>
                        <div className="bg-bg-base p-4 rounded-2xl rounded-tl-none border border-bg-surface-hover flex items-center gap-2 shadow-sm">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-5 bg-bg-surface-hover/10 border-t border-bg-surface-hover">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t("staticPages.help.botPlaceholder")}
                        className="w-full bg-bg-base border border-bg-surface-hover text-white text-sm rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:border-brand transition-all shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-2 top-2 bottom-2 w-11 bg-brand hover:bg-brand-hover disabled:opacity-30 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer group"
                    >
                        <Send className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </form>
        </div>
    );
}
