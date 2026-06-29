import { BRAND_NAME } from "@/constants";
import Logo from "@/components/common/Logo";

export default function Loading() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <Logo className="w-16 h-16 text-brand animate-pulse" />
        <div className="text-brand text-3xl font-black tracking-wider animate-pulse">
          {BRAND_NAME}
        </div>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" />
        </div>
      </div>
    </div>
  );
}
