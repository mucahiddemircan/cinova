"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";
import ChatBot from "@/components/support/ChatBot";

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-bg-surface rounded-xl border border-bg-surface-hover overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-bg-surface-hover/30 transition-colors group cursor-pointer"
      >
        <span className="text-white font-bold pr-8">{question}</span>
        <div
          className={`w-6 h-6 flex items-center justify-center shrink-0 transition-transform duration-300 ${
            isOpen ? "rotate-45" : "rotate-0"
          }`}
        >
          <Plus className="h-6 w-6 text-white" />
        </div>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden`}
      >
        <p className="p-6 pt-0 text-text-secondary border-t border-bg-surface-hover/50">
          {answer}
        </p>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const router = useRouter();
  const { t, getLocalizedPath } = useLanguage();

  const faqs = (t("staticPages.help.faqs") as unknown as any[]) || [];

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-black mb-8 border-b border-bg-surface-hover pb-4">
        {t("staticPages.help.title")}
      </h1>

      <div className="space-y-12">
        <section>
          <h2 className="text-xl text-white font-bold mb-6">
            {t("staticPages.help.subtitle")}
          </h2>
          <div className="grid gap-4">
            {Array.isArray(faqs) &&
              faqs.map((faq, idx) => <FaqItem key={idx} {...faq} />)}
          </div>
        </section>

        <section>
          <h2 className="text-xl text-white font-bold mb-6">
            {t("staticPages.help.botTitle")}
          </h2>
          <ChatBot />
        </section>

        <section className="bg-bg-surface p-10 rounded-3xl text-center">
          <h2 className="text-xl text-white font-bold mb-3">
            {t("staticPages.help.stillHaveQuestions")}
          </h2>
          <p className="text-text-secondary mb-8 max-w-lg mx-auto leading-relaxed">
            {t("staticPages.help.contactSupportSub")}
          </p>
          <button
            onClick={() => router.push(getLocalizedPath("/contact"))}
            className="bg-brand hover:bg-brand-hover text-white px-10 py-4 rounded-full font-bold transition-all hover:scale-105 cursor-pointer shadow-lg shadow-brand/10"
          >
            {t("staticPages.help.contactSupportBtn")}
          </button>
        </section>
      </div>
    </div>
  );
}
