import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Mevcut dile göre URL'nin başına otomatik olarak dil prefix'i ekleyen Link bileşeni.
 * İngilizce (en) için prefix eklemez.
 * Türkçe (tr) için /tr prefix'i ekler.
 */
const LocalizedLink = ({ to, children, ...props }) => {
    const { language } = useLanguage();

    const getLocalizedPath = (path) => {
        if (!path) return path;
        
        // Eğer yol zaten bir prefix ile başlıyorsa (örn: http, /tr) dokunma
        if (path.startsWith('http') || path.startsWith('/tr')) {
            return path;
        }

        if (language === 'tr') {
            // Başındaki / karakterini koruyarak /tr ekle
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
