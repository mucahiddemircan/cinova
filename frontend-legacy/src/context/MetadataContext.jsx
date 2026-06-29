import React, { createContext, useContext, useState, useEffect } from "react";
import { metadataApi } from "../api";
import { useLanguage } from "./LanguageContext";

const MetadataContext = createContext();

export const MetadataProvider = ({ children }) => {
    const { language } = useLanguage();
    const [metadata, setMetadata] = useState({
        genres: { movie: {}, series: {} },
        countries: {},
        languages: {},
        local: {},
        loading: true,
        error: null
    });

    const fetchMetadata = async () => {
        try {
            setMetadata(prev => ({ ...prev, loading: true }));
            const config = await metadataApi.getConfig();
            setMetadata({
                ...config,
                loading: false,
                error: null
            });
        } catch (err) {
            console.error("Failed to fetch metadata:", err);
            setMetadata(prev => ({ ...prev, loading: false, error: err }));
        }
    };

    useEffect(() => {
        fetchMetadata();
    }, [language]);

    // Helper functions
    const getGenreName = (id, type = "movie") => {
        const typeKey = type === "tv" || type === "series" ? "series" : "movie";
        return metadata.genres[typeKey]?.[id] || `Genre ${id}`;
    };

    const getCountryName = (code) => {
        return metadata.countries[code] || code;
    };

    const translateLocal = (category, key) => {
        const catMap = metadata.local[category] || {};
        return catMap[key] || key;
    };

    return (
        <MetadataContext.Provider value={{ 
            ...metadata, 
            getGenreName, 
            getCountryName, 
            translateLocal,
            refresh: fetchMetadata 
        }}>
            {children}
        </MetadataContext.Provider>
    );
};

export const useMetadata = () => {
    const context = useContext(MetadataContext);
    if (!context) {
        throw new Error("useMetadata must be used within a MetadataProvider");
    }
    return context;
};
