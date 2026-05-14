export const dictionaries = {
  it: {
    test: {
      hello: "Ciao",
    },
  },

  en: {
    test: {
      hello: "Hello",
    },
  },
}

export function getDictionary(
  language: string
) {
  return (
    dictionaries[
      language as keyof typeof dictionaries
    ] || dictionaries.it
  )
}
