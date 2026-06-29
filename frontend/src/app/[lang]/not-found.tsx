import Link from "next/link";
import { BRAND_NAME } from "@/constants";
import Logo from "@/components/common/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-brand flex items-center gap-2">
        <Logo className="w-10 h-10" />
        <span className="text-3xl font-black tracking-wider">{BRAND_NAME}</span>
      </div>
      <p className="text-6xl font-black text-white">404</p>
      <p className="text-text-secondary text-lg text-center">
        Aradığınız sayfa bulunamadı.
      </p>
      <Link
        href="/"
        className="bg-brand hover:bg-brand-hover text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
