// backend/agent/rituals/gentleContainment.js

const GENTLE_CONTAINMENT_OPENINGS = [
  "Possiamo restare su qualcosa di semplice.",
  "Oggi possiamo tenere le cose leggere.",
  "Non serve aprire tutto insieme.",
  "Possiamo stare vicino a una sola cosa.",
  "Puoi restare su ciò che senti più accessibile.",
]

const GENTLE_CONTAINMENT_FIELDS = [
  "Può bastare anche solo nominare quello che c'è.",
  "Non serve andare più a fondo di quanto senti.",
  "Anche stare vicino a poco può bastare.",
  "Puoi lasciarlo semplice, per oggi.",
  "Non c'è nulla da forzare qui.",
]

const FORBIDDEN_PATTERNS = [
  /\bcapisco\b/i,
  /\bso che\b/i,
  /\bsembra\b/i,
  /\bstai\b/i,
  /\btrauma\b/i,
  /\btrigger\b/i,
  /\bferita\b/i,
  /\bguarire\b/i,
  /\bguarigione\b/i,
  /\bdevi\b/i,
  /\bdovresti\b/i,
  /\brespira\b/i,
  /\bmedita\b/i,
  /\baccogli\b/i,
  /\bosserva\b/i,
  /\bperché\b/i,
  /\?$/,
]

const MAX_WORDS = 20
const DEFAULT_SEED = 23

function countWords(text = "") {
  return (text.match(/\b[\p{L}\p{N}'’-]+\b/gu) || []).length
}

function cleanSpacing(text = "") {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim()
}

function containsForbiddenPattern(text = "") {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text))
}

function seededIndex(seed, length) {
  const n = Math.abs(Number(seed) || DEFAULT_SEED)
  return n % length
}

function buildUserSeed(context = {}) {
  const {
    userId = "anonymous",
    recentIntensityScore = 0,
    guidedSessions7d = 0,
    heavyNotes7d = 0,
  } = context

  const raw = `${userId}:${recentIntensityScore}:${guidedSessions7d}:${heavyNotes7d}`
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function pickOpening(context = {}) {
  const seed = buildUserSeed(context)
  return GENTLE_CONTAINMENT_OPENINGS[
    seededIndex(seed, GENTLE_CONTAINMENT_OPENINGS.length)
  ]
}

function pickField(context = {}) {
  const seed = buildUserSeed({
    ...context,
    userId: `${context.userId || "anonymous"}:field`,
  })
  return GENTLE_CONTAINMENT_FIELDS[
    seededIndex(seed, GENTLE_CONTAINMENT_FIELDS.length)
  ]
}

function validateGentleContainmentMessage(text = "") {
  const normalized = cleanSpacing(text)

  if (!normalized) {
    throw new Error("gentle_containment_empty_message")
  }

  if (countWords(normalized) > MAX_WORDS) {
    throw new Error("gentle_containment_too_long")
  }

  if (containsForbiddenPattern(normalized)) {
    throw new Error("gentle_containment_forbidden_wording")
  }

  return normalized
}

function buildGentleContainmentVariant(context = {}) {
  const guidedSessions7d = Number(context.guidedSessions7d || 0)
  const heavyNotes7d = Number(context.heavyNotes7d || 0)
  const recentIntensityScore = Number(context.recentIntensityScore || 0)

  if (guidedSessions7d >= 2) return "post_guided"
  if (heavyNotes7d >= 2) return "dense_recent"
  if (recentIntensityScore >= 7) return "high_intensity"
  return "light_containment"
}

export function generateGentleContainmentMessage(context = {}) {
  const opening = pickOpening(context)
  const field = pickField(context)
  const rawMessage = `${opening} ${field}`

  try {
    const message = validateGentleContainmentMessage(rawMessage)

    return {
      mode: "gentle_containment",
      message,
      messageMeta: {
        variant: buildGentleContainmentVariant(context),
        hasContainmentField: true,
        wordCount: countWords(message),
        source: "rules_template_v1",
      },
    }
  } catch {
    const fallback = "Possiamo restare su qualcosa di semplice."
    return {
      mode: "gentle_containment",
      message: fallback,
      messageMeta: {
        variant: "fallback",
        hasContainmentField: false,
        wordCount: countWords(fallback),
        source: "rules_template_v1_fallback",
      },
    }
  }
}

export function isGentleContainmentEligible(context = {}) {
  const isNewUser = Boolean(context.isNewUser)
  const isSoftReentry = Boolean(context.isSoftReentry)
  const hasCompletedGuidedRecently = Boolean(context.hasCompletedGuidedRecently)

  const heavyNotes7d = Number(context.heavyNotes7d || 0)
  const recentIntensityScore = Number(context.recentIntensityScore || 0)
  const interactions3d = Number(context.interactions3d || 0)

  if (isNewUser) return false
  if (isSoftReentry) return false

  if (hasCompletedGuidedRecently) return true
  if (heavyNotes7d >= 2) return true
  if (recentIntensityScore >= 7) return true
  if (interactions3d >= 4 && recentIntensityScore >= 5) return true

  return false
}
