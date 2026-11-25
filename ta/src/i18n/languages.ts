
import { type Locale, isRtl, routing } from "./routing";

export interface Language {
  id: Locale;
  /** Native display name. */
  name: string;
  /** Short code shown in compact UI (e.g. the dropdown trigger). */
  shortName: string;
  badge?: string;
}

export const languages: readonly Language[] = [
  { id: "en", name: "English", shortName: "EN" },
];

const defaultLanguage = languages.find(
  (l) => l.id === routing.defaultLocale,
) as Language;

export const getLanguage = (locale: Locale): Language =>
  languages.find((l) => l.id === locale) ?? defaultLanguage;

export { isRtl };
