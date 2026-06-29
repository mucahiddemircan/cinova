import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TRANSLATIONS, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../i18n';
import { BRAND_NAME } from '../constants';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const location = useLocation();
    const navigate = useNavigate();

    // Language detection hierarchy
    const detectLanguage = useCallback(() => {
        // 1. URL Structure (/tr check)
        if (location.pathname.startsWith('/tr/') || location.pathname === '/tr') {
            return 'tr';
        }

        // 2. User Preference (LocalStorage)
        const saved = localStorage.getItem('app_language');
        if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
            // If in root directory and preference is tr, redirect will be performed (in useEffect)
            return saved;
        }

        // 3. Browser Language
        const browserLang = navigator.language.split('-')[0];
        if (SUPPORTED_LANGUAGES.includes(browserLang)) {
            return browserLang;
        }

        return DEFAULT_LANGUAGE;
    }, [location.pathname]);

    const [language, setLanguage] = useState(detectLanguage);

    // URL or State synchronization
    useEffect(() => {
        const detected = detectLanguage();
        
        // If URL starts with /tr/ but state is different, update state
        if (location.pathname.startsWith('/tr') && language !== 'tr') {
            setLanguage('tr');
        } 
        // If URL does not start with /tr/ but state is tr (user manually deleted /tr)
        else if (!location.pathname.startsWith('/tr') && language === 'tr') {
            // If we are actually at root and preference is tr, should we redirect?
            // Let's only sync state for now.
            setLanguage('en');
        }
    }, [location.pathname, detectLanguage, language]);

    // Initial redirect (if at root URL and language is tr)
    useEffect(() => {
        const saved = localStorage.getItem('app_language');
        const browserLang = navigator.language.split('-')[0];
        const isTurkishPrefered = saved === 'tr' || (!saved && browserLang === 'tr');

        if (isTurkishPrefered && !location.pathname.startsWith('/tr')) {
            // Redirect only for root paths (en -> tr)
            const newPath = `/tr${location.pathname === '/' ? '' : location.pathname}`;
            // navigate(newPath, { replace: true }); 
            // Note: This auto-redirection might be healthier as a Guard in App.jsx for SEO.
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
            // Update LocalStorage immediately
            localStorage.setItem('app_language', newLang);
            
            // Clean current path
            const currentPath = location.pathname;
            const cleanPath = currentPath.startsWith('/tr')
                ? currentPath.replace(/^\/tr/, '') || '/'
                : currentPath;

            // Construct the new path
            const newBasePath = newLang === 'tr'
                ? `/tr${cleanPath === '/' ? '' : cleanPath}`
                : cleanPath;

            // Add Query and Hash
            const fullPath = `${newBasePath}${location.search}${location.hash}`;

            // Redirect by refreshing page completely (Best Practice: State Reset & API Refresh)
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
