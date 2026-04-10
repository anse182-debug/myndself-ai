// backend/agent/rituals/patternMirror.js

const RECURRING_TEMPLATES = [
  `Negli ultimi giorni, "{emotion}" è tornata più di una volta.`,
  `"{emotion}" continua a riemergere in questi giorni.`,
  `C'è qualcosa in "{emotion}" che sta tornando spesso.`,
]

const RETURN_TEMPLATES = [
  `"{emotion}" è riemersa dopo pochi giorni.`,
  `Negli ultimi giorni, "{emotion}" è tornata a farsi vedere.`,
  `"{emotion}" tende a ripresentarsi in questa fase.`,
]

const FORBIDDEN_PATTERNS = [
  /\bperché\b/i,
  /\bcausa\b/i,
  /\bsuccede quando\b/i,
  /\btrauma\b/i,
  /\bferita\b/i,
  /\bdevi\b/i,
  /\bdovresti\b/i,
  /\bsempre\b/i,
  /\bmai\b/i,
  /\?$/,
]

const MAX_WORDS = 18
const DEFAULT_SEED = 29

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
    emotion = "pattern",
    occurrences7d = 0,
    daysSinceLastSeen = 0,
  } = context

  const raw = `${userId}:${emotion}:${occurrences7d}:${daysSinceLastSeen}`
  let hash = 0
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function applyTemplate(template, emotion) {
  return template.replaceAll("{emotion}", emotion)
}

function validatePatternMirrorMessage(text = "") {
  const normalized = cleanSpacing(text)

  if (!normalized) {
    throw new Error("pattern_mirror_empty_message")
  }

  if (countWords(normalized) > MAX_WORDS) {
    throw new Error("pattern_mirror_too_long")
  }

  if (containsForbiddenPattern(normalized)) {
    throw new Error("pattern_mirror_forbidden_wording")
  }

  return normalized
}

export function isPatternMirrorEligible(context = {}) {
  const isNewUser = Boolean(context.isNewUser)
  const isSoftReentry = Boolean(context.isSoftReentry)
  const isGentleContainment = Boolean(context.isGentleContainment)
  const occurrences7d = Number(context.occurrences7d || 0)
  const daysSinceLastSeen = context.daysSinceLastSeen

  if (isNewUser) return false
  if (isSoftReentry) return false
  if (isGentleContainment) return false

  if (occurrences7d >= 3) return true
  if (
    occurrences7d >= 2 &&
    typeof daysSinceLastSeen === "number" &&
    daysSinceLastSeen >= 2 &&
    daysSinceLastSeen <= 5
  ) {
    return true
  }

  return false
}

export function generatePatternMirrorMessage(context = {}) {
  const emotion = String(context.emotion || "").trim()
  const occurrences7d = Number(context.occurrences7d || 0)
  const daysSinceLastSeen = context.daysSinceLastSeen
  const seed = buildUserSeed(context)

  let templateSet = RECURRING_TEMPLATES
  let variant = "recurring"

  if (
    occurrences7d >= 2 &&
    typeof daysSinceLastSeen === "number" &&
    daysSinceLastSeen >= 2 &&
    daysSinceLastSeen <= 5
  ) {
    templateSet = RETURN_TEMPLATES
    variant = "returning"
  }

  const template = templateSet[seededIndex(seed, templateSet.length)]
  const rawMessage = applyTemplate(template, emotion)

  try {
    const message = validatePatternMirrorMessage(rawMessage)

    return {
      mode: "pattern_mirror",
      message,
      messageMeta: {
        variant,
        emotion,
        occurrences7d,
        daysSinceLastSeen: daysSinceLastSeen ?? null,
        wordCount: countWords(message),
        source: "rules_template_v1",
      },
    }
  } catch {
    const fallback = `Negli ultimi giorni, "${emotion}" è tornata più di una volta.`
    return {
      mode: "pattern_mirror",
      message: fallback,
      messageMeta: {
        variant: "fallback",
        emotion,
        occurrences7d,
        daysSinceLastSeen: daysSinceLastSeen ?? null,
        wordCount: countWords(fallback),
        source: "rules_template_v1_fallback",
      },
    }
  }
}
