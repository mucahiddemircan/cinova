/**
 * Main i18n module.
 * To add a new language: import it and add to TRANSLATIONS.
 */
import tr from "./translations/tr";
import en from "./translations/en";

export const TRANSLATIONS: Record<string, Record<string, unknown>> = { tr, en };
export const SUPPORTED_LANGUAGES = ["tr", "en"];
export const DEFAULT_LANGUAGE = "en";
