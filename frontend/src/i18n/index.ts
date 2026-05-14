import { it } from "./it"
import { en } from "./en"

export const dictionaries = {
  it,
  en,
}

export type Language = "it" | "en"

export function getDictionary(
  language: Language
) {
  return (
    dictionaries[language] ||
    dictionaries.it
  )
}
