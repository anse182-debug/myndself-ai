import { it } from "./it"
import { en } from "./en"

export const dictionaries = {
  it,
  en,
}

export function getDictionary(language: string) {
  return (
    dictionaries[
      language as keyof typeof dictionaries
    ] || dictionaries.it
  )
}
