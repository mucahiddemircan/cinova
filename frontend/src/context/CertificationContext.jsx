import React, { createContext, useContext, useState, useEffect } from "react";
import { certificationsApi } from "../api";

const CertificationContext = createContext();

export function CertificationProvider({ children }) {
    const [certMap, setCertMap] = useState({});

    useEffect(() => {
        certificationsApi.getGlobal()
            .then(data => setCertMap(data))
            .catch(err => console.error("Sertifika yükleme hatası:", err));
    }, []);

    const getCertInfo = (certification) => {
        if (!certification) return null;

        // 1. Manuel İstisnalar (Yaygın global etiketler)
        const manualMap = {
            "R": 18, "NC-17": 18, "TV-MA": 18, "X": 18,
            "PG-13": 13, "TV-14": 15, "12A": 12, "PG": 7,
            "TV-PG": 7, "G": 0, "TV-G": 0, "TV-Y": 0
        };

        let age = -1;
        if (manualMap[certification] !== undefined) {
            age = manualMap[certification];
        } else {
            // 2. Sayı Ayıklama (Örn: "13A", "16+", "+18" -> 13, 16, 18)
            const match = certification.match(/\d+/);
            if (match) {
                age = parseInt(match[0]);
            }
        }

        // 3. Şiddet Puanı (Severity Score) ile Eşleştirme (Sayı bulunamadıysa)
        const severity = certMap[certification] || 0;

        let label = certification;
        let colorClass = "border-green-500 text-green-500";

        // Belirlenen yaşa veya şiddet puanına göre kategorize et
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
            // Sayı yoksa normalizasyon puanına göre (severity)
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

export function useCertification() {
    return useContext(CertificationContext);
}
