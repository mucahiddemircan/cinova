import { SearchX } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import ErrorState from "../components/common/ErrorState";

export default function NotFound() {
    const { t } = useLanguage();

    return (
        <ErrorState 
            title={t("errors.notFound.title")}
            subtitle={t("errors.notFound.subtitle")}
            icon={SearchX}
            buttonText={t("errors.notFound.homeBtn")}
            buttonLink="/"
            errorCode="404"
        />
    );
}
