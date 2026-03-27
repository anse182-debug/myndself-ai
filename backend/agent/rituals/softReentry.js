// backend/agent/rituals/softReentry.js

const SOFT_REENTRY_OPENINGS = [
  "Possiamo riprendere con calma.",
  "C'è spazio per iniziare piano.",
  "Va bene iniziare da poco.",
  "Possiamo stare su qualcosa di leggero.",
  "Puoi restare su qualcosa di semplice.",
]

const SOFT_REENTRY_PRESENCE_FIELDS = [
  "Non serve fare molto oggi.",
  "Anche poco va bene.",
  "Può bastare qualcosa di essenziale.",
  "Non c'è nulla da forzare.",
  "Puoi tenerla molto leggera.",
]

const FORBIDDEN_PATTERNS = [
  /\bbentornat[oa]?\b/i,
  /\britorno\b/i,
  /\btornare\b/i,
  /\bpausa\b/i,
  /\bassenza\b/i,
  /\bgiorni\b/i,
  /\btempo\b/i,
  /\briprendi\b/i,
  /\bpercorso\b/i,
  /\bstreak\b/i,
  /\bcapisco\b/i,
  /\bho notato\b/i,
  /\bhai fatto\b/i,
  /\bdovresti\b/i,
  /\bdevi\b/i,
  /\bperché\b/i,
  /\?$/,
]

const MAX_WORDS = 16
const DEFAULT_SEED = 17

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

// RNG deterministico semplice per evitare random puro in produzione
function seededIndex(seed, length) {
  const n = Math.abs(Number(seed) || DEFAULT_SEED)
  return n % length
}

function buildUserSeed(context = {}) {
  const {
    userId = "anonymous",
    daysSinceLastCheckin = 0,
    ritualCount7d = 0,
  } = context

  const raw = `${userId}:${daysSinceLastCheckin}:${ritualCount7d}`
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function pickOpening(context = {}) {
  const seed = buildUserSeed(context)
  return SOFT_REENTRY_OPENINGS[seededIndex(seed, SOFT_REENTRY_OPENINGS.length)]
}

function pickPresenceField(context = {}) {
  const seed = buildUserSeed({
    ...context,
    userId: `${context.userId || "anonymous"}:presence`,
  })
  return SOFT_REENTRY_PRESENCE_FIELDS[
    seededIndex(seed, SOFT_REENTRY_PRESENCE_FIELDS.length)
  ]
}

function shouldAddPresenceField(context = {}) {
  const days = Number(context.daysSinceLastCheckin || 0)
  const emotionalDensity = context.recentEmotionalDensity || "unknown"

  if (days >= 5) return true
  if (emotionalDensity === "high") return true
  if (days <= 2) return false

  return true
}

function validateSoftReentryMessage(text = "") {
  const normalized = cleanSpacing(text)

  if (!normalized) {
    throw new Error("soft_reentry_empty_message")
  }

  if (countWords(normalized) > MAX_WORDS) {
    throw new Error("soft_reentry_too_long")
  }

  if (containsForbiddenPattern(normalized)) {
    throw new Error("soft_reentry_forbidden_wording")
  }

  return normalized
}

function buildSoftReentryVariant(context = {}) {
  const days = Number(context.daysSinceLastCheckin || 0)
  const emotionalDensity = context.recentEmotionalDensity || "unknown"

  if (emotionalDensity === "high") return "fragile"
  if (days >= 6) return "deep"
  return "light"
}

export function generateSoftReentryMessage(context = {}) {
  const opening = pickOpening(context)
  const presence = shouldAddPresenceField(context)
    ? pickPresenceField(context)
    : null

  const rawMessage = presence ? `${opening} ${presence}` : opening

  try {
    const message = validateSoftReentryMessage(rawMessage)

    return {
      mode: "soft_reentry",
      message,
      messageMeta: {
        variant: buildSoftReentryVariant(context),
        hasPresenceField: Boolean(presence),
        wordCount: countWords(message),
        source: "rules_template_v1",
      },
    }
  } catch {
    const fallback = "Possiamo riprendere con calma."
    return {
      mode: "soft_reentry",
      message: fallback,
      messageMeta: {
        variant: "fallback",
        hasPresenceField: false,
        wordCount: countWords(fallback),
        source: "rules_template_v1_fallback",
      },
    }
  }
}

export function isSoftReentryEligible(context = {}) {
  const days = Number(context.daysSinceLastCheckin || 0)
  const checkinsLast4d = Number(context.checkinsLast4d || 0)
  const isNewUser = Boolean(context.isNewUser)

  if (isNewUser) return false

  return days >= 3 && checkinsLast4d === 0
}
