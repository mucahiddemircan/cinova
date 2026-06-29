"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { certificationsApi } from "@/lib/api";

interface CertInfo {
  label: string;
  colorClass: string;
}

interface CertificationContextValue {
  getCertInfo: (certification: string | null | undefined) => CertInfo | null;
}

const CertificationContext = createContext<CertificationContextValue | null>(
  null
);

export function CertificationProvider({ children }: { children: ReactNode }) {
  const [certMap, setCertMap] = useState<Record<string, number>>({});

  useEffect(() => {
    certificationsApi
      .getGlobal()
      .then((data) => setCertMap(data))
      .catch((err) => console.error("Sertifika yükleme hatası:", err));
  }, []);

  const getCertInfo = (
    certification: string | null | undefined
  ): CertInfo | null => {
    if (!certification) return null;

    const manualMap: Record<string, number> = {
      R: 18,
      "NC-17": 18,
      "TV-MA": 18,
      X: 18,
      "PG-13": 13,
      "TV-14": 15,
      "12A": 12,
      PG: 7,
      "TV-PG": 7,
      G: 0,
      "TV-G": 0,
      "TV-Y": 0,
    };

    let age = -1;
    if (manualMap[certification] !== undefined) {
      age = manualMap[certification];
    } else {
      const match = certification.match(/\d+/);
      if (match) age = parseInt(match[0]);
    }

    const severity = certMap[certification] || 0;

    let label = certification;
    let colorClass = "border-green-500 text-green-500";

    if (age !== -1) {
      if (age >= 18) {
        label = "18+";
        colorClass = "border-red-500 text-red-500";
      } else if (age >= 15) {
        label = "15+";
        colorClass = "border-orange-500 text-orange-500";
      } else if (age >= 13) {
        label = "13+";
        colorClass = "border-yellow-500 text-yellow-500";
      } else if (age >= 7 || age >= 6) {
        label = "7+";
        colorClass = "border-lime-500 text-lime-500";
      } else {
        label = "Genel";
        colorClass = "border-green-500 text-green-500";
      }
    } else {
      if (severity > 0.8) {
        label = "18+";
        colorClass = "border-red-500 text-red-500";
      } else if (severity > 0.6) {
        label = "15+";
        colorClass = "border-orange-500 text-orange-500";
      } else if (severity > 0.4) {
        label = "13+";
        colorClass = "border-yellow-500 text-yellow-500";
      } else if (severity > 0.2) {
        label = "7+";
        colorClass = "border-lime-500 text-lime-500";
      } else {
        label = "Genel";
        colorClass = "border-green-500 text-green-500";
      }
    }

    return { label, colorClass };
  };

  return (
    <CertificationContext.Provider value={{ getCertInfo }}>
      {children}
    </CertificationContext.Provider>
  );
}

export const useCertification = (): CertificationContextValue => {
  const context = useContext(CertificationContext);
  if (!context) {
    throw new Error(
      "useCertification must be used within CertificationProvider"
    );
  }
  return context;
};
