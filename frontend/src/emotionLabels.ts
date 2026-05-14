export const emotionLabels: Record<
  string,
  { it: string; en: string }
> = {
  calmo: { it: "Calmo", en: "Calm" },
  grato: { it: "Grato", en: "Grateful" },
  contento: { it: "Contento", en: "Happy" },
  entusiasta: { it: "Entusiasta", en: "Excited" },

  stressato: { it: "Stressato", en: "Stressed" },
  stanco: { it: "Stanco", en: "Tired" },
  sovraccarico: { it: "Sovraccarico", en: "Overwhelmed" },
  ansioso: { it: "Ansioso", en: "Anxious" },

  triste: { it: "Triste", en: "Sad" },
  arrabbiato: { it: "Arrabbiato", en: "Angry" },
  frustrato: { it: "Frustrato", en: "Frustrated" },
  confuso: { it: "Confuso", en: "Confused" },

  annoiato: { it: "Annoiato", en: "Bored" },

  rabbia: { it: "Rabbia", en: "Anger" },
  frustrazione: { it: "Frustrazione", en: "Frustration" },
  impazienza: { it: "Impazienza", en: "Impatience" },
  agitazione: { it: "Agitazione", en: "Agitation" },

  determinazione: { it: "Determinazione", en: "Determination" },
  motivazione: { it: "Motivazione", en: "Motivation" },
  entusiasmo: { it: "Entusiasmo", en: "Enthusiasm" },

  apatia: { it: "Apatia", en: "Apathy" },
  "stanchezza mentale": {
    it: "Stanchezza mentale",
    en: "Mental fatigue",
  },
  "stanchezza fisica": {
    it: "Stanchezza fisica",
    en: "Physical fatigue",
  },

  noia: { it: "Noia", en: "Boredom" },

  "ansia a bassa intensità": {
    it: "Ansia a bassa intensità",
    en: "Low-level anxiety",
  },

  "ansia bassa intensità": {
    it: "Ansia bassa intensità",
    en: "Low-level anxiety",
  },

  "ansia forte": {
    it: "Ansia forte",
    en: "Intense anxiety",
  },

  "senso di colpa": {
    it: "Senso di colpa",
    en: "Guilt",
  },

  confusione: { it: "Confusione", en: "Confusion" },

  serenità: { it: "Serenità", en: "Serenity" },
  apprezzamento: { it: "Apprezzamento", en: "Appreciation" },
  gratitudine: { it: "Gratitudine", en: "Gratitude" },
  speranza: { it: "Speranza", en: "Hope" },
  fiducia: { it: "Fiducia", en: "Trust" },
  curiosità: { it: "Curiosità", en: "Curiosity" },
  vicinanza: { it: "Vicinanza", en: "Closeness" },

  vuoto: { it: "Vuoto", en: "Emptiness" },
  solitudine: { it: "Solitudine", en: "Loneliness" },
}

export function getEmotionLabel(
  key: string,
  language: string
): string {
  const entry = emotionLabels[key]
  if (!entry) return key

  return (
    entry[language as "it" | "en"] ||
    entry.it
  )
}
