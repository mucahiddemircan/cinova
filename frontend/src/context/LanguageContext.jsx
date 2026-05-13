import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TRANSLATIONS, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../i18n';
import { BRAND_NAME } from '../constants';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const location = useLocation();
    const navigate = useNavigate();

    // Dil tespit hiyerarşisi
    const detectLanguage = useCallback(() => {
        // 1. URL Yapısı (/tr kontrolü)
        if (location.pathname.startsWith('/tr/') || location.pathname === '/tr') {
            return 'tr';
        }

        // 2. Kullanıcı Tercihi (LocalStorage)
        const saved = localStorage.getItem('app_language');
        if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
            // Eğer kök dizindeyse ve tercihi tr ise yönlendirme yapılacak (useEffect içinde)
            return saved;
        }

        // 3. Tarayıcı Dili
        const browserLang = navigator.language.split('-')[0];
        if (SUPPORTED_LANGUAGES.includes(browserLang)) {
            return browserLang;
        }

        return DEFAULT_LANGUAGE;
    }, [location.pathname]);

    const [language, setLanguage] = useState(detectLanguage);

    // URL veya State senkronizasyonu
    useEffect(() => {
        const detected = detectLanguage();
        
        // Eğer URL /tr/ ile başlıyorsa ama state farklıysa state'i güncelle
        if (location.pathname.startsWith('/tr') && language !== 'tr') {
            setLanguage('tr');
        } 
        // Eğer URL /tr/ ile başlamıyorsa ama state tr ise (kullanıcı manuel /tr'yi sildiyse)
        else if (!location.pathname.startsWith('/tr') && language === 'tr') {
            // Eğer gerçekten root'taysak ve tercihimiz tr ise yönlendirme yapmalı mıyız?
            // Şimdilik sadece state'i senkronize edelim.
            setLanguage('en');
        }
    }, [location.pathname, detectLanguage, language]);

    // Başlangıç yönlendirmesi (Kök URL'de ise ve dil tr ise)
    useEffect(() => {
        const saved = localStorage.getItem('app_language');
        const browserLang = navigator.language.split('-')[0];
        const isTurkishPrefered = saved === 'tr' || (!saved && browserLang === 'tr');

        if (isTurkishPrefered && !location.pathname.startsWith('/tr')) {
            // Sadece root paths için yönlendirme yap (en -> tr)
            const newPath = `/tr${location.pathname === '/' ? '' : location.pathname}`;
            // navigate(newPath, { replace: true }); 
            // Not: Bu otomatik yönlendirme SEO için App.jsx içinde bir Guard ile yapılması daha sağlıklı olabilir.
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('app_language', language);
        document.documentElement.lang = language;
    }, [language]);

    const t = (key, params = {}) => {
        if (!key) return '';
        const keys = key.split('.');
        let value = TRANSLATIONS[language];
        for (const k of keys) {
            if (value === undefined) break;
            value = value[k];
        }
        if (value === undefined || value === null) return key;

        const translationParams = { brand: BRAND_NAME, ...params };

        const processValue = (val) => {
            if (typeof val === 'string') {
                let result = val;
                Object.entries(translationParams).forEach(([k, v]) => {
                    result = result.replace(new RegExp(`{${k}}`, 'g'), v);
                });
                return result;
            }
            if (Array.isArray(val)) {
                return val.map(item => processValue(item));
            }
            if (val && typeof val === 'object') {
                const result = {};
                Object.entries(val).forEach(([k, v]) => {
                    result[k] = processValue(v);
                });
                return result;
            }
            return val;
        };

        return processValue(value);
    };

    const tmdbLanguage = language === 'tr' 
        ? { primary: 'tr-TR', fallback: 'en-US' }
        : { primary: 'en-US', fallback: null };

    const changeLanguage = (newLang) => {
        if (newLang !== language && SUPPORTED_LANGUAGES.includes(newLang)) {
            // LocalStorage'ı hemen güncelle
            localStorage.setItem('app_language', newLang);
            
            // Mevcut path'i temizle
            const currentPath = location.pathname;
            const cleanPath = currentPath.startsWith('/tr')
                ? currentPath.replace(/^\/tr/, '') || '/'
                : currentPath;

            // Yeni path'i oluştur
            const newBasePath = newLang === 'tr'
                ? `/tr${cleanPath === '/' ? '' : cleanPath}`
                : cleanPath;

            // Query ve Hash'i ekle
            const fullPath = `${newBasePath}${location.search}${location.hash}`;

            // Sayfayı tamamen yenileyerek yönlendir (Best Practice: State Reset & API Refresh)
            window.location.href = fullPath;
        }
    };

    const getLocalizedPath = useCallback((path) => {
        if (!path) return path;
        if (path.startsWith('http') || path.startsWith('/tr')) return path;

        if (language === 'tr') {
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            return `/tr${cleanPath === '/' ? '' : cleanPath}`;
        }
        return path;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t, tmdbLanguage, getLocalizedPath }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
