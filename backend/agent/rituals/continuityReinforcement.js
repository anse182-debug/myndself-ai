// backend/agent/rituals/continuityReinforcement.js

const CONTINUITY_OPENINGS = [
  "C'è già una certa continuità in questi giorni.",
  "Qualcosa qui sta diventando più stabile.",
  "Stai creando un ritmo, anche senza forzarlo.",
  "La tua presenza qui sta prendendo una forma costante.",
  "In questi giorni si sente più continuità.",
]

const CONTINUITY_FIELDS = [
  "Anche questo conta.",
  "Si vede già, anche in modo semplice.",
  "Non serve renderlo perfetto perché sia reale.",
  "Può restare leggero, ed essere comunque presente.",
  "È già qualcosa che esiste.",
]

const FORBIDDEN_PATTERNS = [
  /\bstreak\b/i,
  /\bserie\b/i,
  /\bcomplimenti\b/i,
  /\bbrav[oa]\b/i,
  /\bottimo lavoro\b/i,
  /\bcontinua così\b/i,
  /\bnon fermarti\b/i,
  /\bdevi\b/i,
  /\bdovresti\b/i,
  /\?$/,
]

const MAX_WORDS = 18
const DEFAULT_SEED = 31

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
    checkinsLast4d = 0,
    checkinsLast7d = 0,
  } = context

  const raw = `${userId}:${checkinsLast4d}:${checkinsLast7d}`
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function validateContinuityMessage(text = "") {
  const normalized = cleanSpacing(text)

  if (!normalized) {
    throw new Error("continuity_reinforcement_empty_message")
  }

  if (countWords(normalized) > MAX_WORDS) {
    throw new Error("continuity_reinforcement_too_long")
  }

  if (containsForbiddenPattern(normalized)) {
    throw new Error("continuity_reinforcement_forbidden_wording")
  }

  return normalized
}

function pickOpening(context = {}) {
  const seed = buildUserSeed(context)
  return CONTINUITY_OPENINGS[seededIndex(seed, CONTINUITY_OPENINGS.length)]
}

function pickField(context = {}) {
  const seed = buildUserSeed({
    ...context,
    userId: `${context.userId || "anonymous"}:field`,
  })
  return CONTINUITY_FIELDS[seededIndex(seed, CONTINUITY_FIELDS.length)]
}

function buildContinuityVariant(context = {}) {
  const checkinsLast4d = Number(context.checkinsLast4d || 0)
  const checkinsLast7d = Number(context.checkinsLast7d || 0)

  if (checkinsLast7d >= 6) return "solid"
  if (checkinsLast4d >= 3) return "recent_rhythm"
  return "light_rhythm"
}

export function isContinuityReinforcementEligible(context = {}) {
  const isNewUser = Boolean(context.isNewUser)
  const isSoftReentry = Boolean(context.isSoftReentry)
  const isGentleContainment = Boolean(context.isGentleContainment)
  const isPatternMirror = Boolean(context.isPatternMirror)

  const checkinsLast4d = Number(context.checkinsLast4d || 0)
  const checkinsLast7d = Number(context.checkinsLast7d || 0)

  if (isNewUser) return false
  if (isSoftReentry) return false
  if (isGentleContainment) return false
  if (isPatternMirror) return false

  if (checkinsLast4d >= 3) return true
  if (checkinsLast7d >= 5) return true

  return false
}

export function generateContinuityReinforcementMessage(context = {}) {
  const opening = pickOpening(context)
  const field = pickField(context)
  const rawMessage = `${opening} ${field}`

  try {
    const message = validateContinuityMessage(rawMessage)

    return {
      mode: "continuity_reinforcement",
      message,
      messageMeta: {
        variant: buildContinuityVariant(context),
        checkinsLast4d: Number(context.checkinsLast4d || 0),
        checkinsLast7d: Number(context.checkinsLast7d || 0),
        wordCount: countWords(message),
        source: "rules_template_v1",
      },
    }
  } catch {
    const fallback = "C'è già una certa continuità in questi giorni."
    return {
      mode: "continuity_reinforcement",
      message: fallback,
      messageMeta: {
        variant: "fallback",
        checkinsLast4d: Number(context.checkinsLast4d || 0),
        checkinsLast7d: Number(context.checkinsLast7d || 0),
        wordCount: countWords(fallback),
        source: "rules_template_v1_fallback",
      },
    }
  }
}
