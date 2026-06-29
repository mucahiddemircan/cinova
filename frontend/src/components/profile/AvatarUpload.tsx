"use client";

import { useState, useRef } from "react";
import { useLanguage } from "@/providers/language-provider";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
import { accountApi } from "@/lib/api";
import { Camera, Loader2, AlertCircle } from "lucide-react";
import Avatar from "../common/Avatar";
import type { User } from "@/types";

interface AvatarUploadProps {
  user: User;
  onUserUpdate?: (user: User) => void;
}

export default function AvatarUpload({ user, onUserUpdate }: AvatarUploadProps) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(t("errors.avatar.size"));
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const options = {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 500,
        useWebWorker: true,
        fileType: "image/webp",
      };
      const compressedFile = await imageCompression(file, options);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !authUser) throw new Error(t("errors.avatar.auth"));

      const filePath = `${authUser.id}/profile.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressedFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: "image/webp",
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const timestamp = new Date().getTime();
      const finalUrl = `${publicUrl}?v=${timestamp}`;

      await accountApi.updateAvatar(finalUrl);

      if (onUserUpdate) {
        onUserUpdate({ ...user, avatar_url: finalUrl });
      }
    } catch (err: any) {
      console.error("Profil fotoğrafı yükleme hatası:", err);
      setError(err.message || t("errors.avatar.general"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileSelect = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
      <div className="relative group shrink-0">
        <div
          className={`w-28 h-28 rounded-full overflow-hidden bg-bg-base/50 flex items-center justify-center text-4xl font-black text-white relative shadow-sm ${
            uploading ? "opacity-50" : "cursor-pointer"
          }`}
          onClick={triggerFileSelect}
        >
          <Avatar
            src={user.avatar_url || ""}
            alt={user.username}
            size="w-28 h-28"
            type="profile"
            showBorder={false}
          />

          {!uploading && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
              <Camera size={24} className="text-white" />
              <span className="text-[10px] font-bold tracking-wider text-white/90">
                {t("avatarUpload.uploadPhoto")}
              </span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <Loader2 className="animate-spin text-brand" size={28} />
            </div>
          )}
        </div>

        <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-bg-surface rounded-full shadow-lg"></div>
      </div>

      <div className="flex flex-col justify-center gap-2 text-center sm:text-left">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            {t("avatarUpload.title")}
          </h3>
          <p className="text-xs text-text-secondary opacity-80 leading-relaxed max-w-md">
            {t("avatarUpload.subtitle")}
          </p>
        </div>

        {error && (
          <p className="text-[11px] text-brand font-bold flex items-center justify-center sm:justify-start gap-1.5 mt-1">
            <AlertCircle size={12} strokeWidth={3} /> {error}
          </p>
        )}

        <div className="mt-1">
          <button
            onClick={triggerFileSelect}
            disabled={uploading}
            className="text-xs font-bold text-white transition-colors px-0 py-1 cursor-pointer hover:underline"
          >
            {t("avatarUpload.uploadPhoto")}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
