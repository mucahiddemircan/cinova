import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Link component that automatically adds a language prefix to the URL based on the current locale.
 * Does not add a prefix for English (en).
 * Adds /tr prefix for Turkish (tr).
 */
const LocalizedLink = ({ to, children, ...props }) => {
    const { language } = useLanguage();

    const getLocalizedPath = (path) => {
        if (!path) return path;
        
        // If path already starts with a prefix (e.g. http, /tr), do not touch
        if (path.startsWith('http') || path.startsWith('/tr')) {
            return path;
        }

        if (language === 'tr') {
            // Prepend /tr preserving the leading / character
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            return `/tr${cleanPath === '/' ? '' : cleanPath}`;
        }

        return path;
    };

    return (
        <Link to={getLocalizedPath(to)} {...props}>
            {children}
        </Link>
    );
};

export default LocalizedLink;
