/**
 * VESPA Score Calculator (Lite)
 *
 * Ported from `Apps/VESPAQuestionnaireV2/src/services/vespaCalculator.js`.
 * Converts statement scores (1-5) to VESPA scores (1-10) using production thresholds.
 */

import type { Question, VespaCategory } from './questions'

const thresholds: Record<Exclude<VespaCategory, 'OUTCOME'>, Array<[number, number]>> = {
  VISION: [
    [0, 2.26],
    [2.26, 2.7],
    [2.7, 3.02],
    [3.02, 3.33],
    [3.33, 3.52],
    [3.52, 3.84],
    [3.84, 4.15],
    [4.15, 4.47],
    [4.47, 4.79],
    [4.79, 5.01],
  ],
  EFFORT: [
    [0, 2.42],
    [2.42, 2.73],
    [2.73, 3.04],
    [3.04, 3.36],
    [3.36, 3.67],
    [3.67, 3.86],
    [3.86, 4.17],
    [4.17, 4.48],
    [4.48, 4.8],
    [4.8, 5.01],
  ],
  SYSTEMS: [
    [0, 2.36],
    [2.36, 2.76],
    [2.76, 3.16],
    [3.16, 3.46],
    [3.46, 3.75],
    [3.75, 4.05],
    [4.05, 4.35],
    [4.35, 4.64],
    [4.64, 4.94],
    [4.94, 5.01],
  ],
  PRACTICE: [
    [0, 1.74],
    [1.74, 2.1],
    [2.1, 2.46],
    [2.46, 2.74],
    [2.74, 3.02],
    [3.02, 3.3],
    [3.3, 3.66],
    [3.66, 3.94],
    [3.94, 4.3],
    [4.3, 5.01],
  ],
  ATTITUDE: [
    [0, 2.31],
    [2.31, 2.72],
    [2.72, 3.01],
    [3.01, 3.3],
    [3.3, 3.53],
    [3.53, 3.83],
    [3.83, 4.06],
    [4.06, 4.35],
    [4.35, 4.7],
    [4.7, 5.01],
  ],
}

function calculateCategoryScore(average: number, category: Exclude<VespaCategory, 'OUTCOME'>) {
  const categoryThresholds = thresholds[category]
  for (let i = 0; i < categoryThresholds.length; i++) {
    const [lower, upper] = categoryThresholds[i]
    if (average >= lower && average < upper) return i + 1
  }
  return 10
}

export function calculateVespaScores(
  responses: Record<string, number | undefined>,
  questions: Question[],
): {
  vespaScores: Record<'VISION' | 'EFFORT' | 'SYSTEMS' | 'PRACTICE' | 'ATTITUDE' | 'OVERALL', number>
  categoryAverages: Record<'VISION' | 'EFFORT' | 'SYSTEMS' | 'PRACTICE' | 'ATTITUDE', number>
  outcomeAverage: number
} {
  const categoryResponses: Record<'VISION' | 'EFFORT' | 'SYSTEMS' | 'PRACTICE' | 'ATTITUDE', number[]> = {
    VISION: [],
    EFFORT: [],
    SYSTEMS: [],
    PRACTICE: [],
    ATTITUDE: [],
  }

  const outcomeValues: number[] = []

  for (const q of questions) {
    const v = responses[q.id]
    if (v === undefined || v === null) continue
    if (q.category === 'OUTCOME') outcomeValues.push(v)
    else categoryResponses[q.category].push(v)
  }

  const categoryAverages: Record<'VISION' | 'EFFORT' | 'SYSTEMS' | 'PRACTICE' | 'ATTITUDE', number> = {
    VISION: 0,
    EFFORT: 0,
    SYSTEMS: 0,
    PRACTICE: 0,
    ATTITUDE: 0,
  }

  for (const k of Object.keys(categoryResponses) as Array<keyof typeof categoryResponses>) {
    const arr = categoryResponses[k]
    categoryAverages[k] = arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0
  }

  const vespaScores = {
    VISION: calculateCategoryScore(categoryAverages.VISION, 'VISION'),
    EFFORT: calculateCategoryScore(categoryAverages.EFFORT, 'EFFORT'),
    SYSTEMS: calculateCategoryScore(categoryAverages.SYSTEMS, 'SYSTEMS'),
    PRACTICE: calculateCategoryScore(categoryAverages.PRACTICE, 'PRACTICE'),
    ATTITUDE: calculateCategoryScore(categoryAverages.ATTITUDE, 'ATTITUDE'),
    OVERALL: 0,
  }

  const overall = Math.round((vespaScores.VISION + vespaScores.EFFORT + vespaScores.SYSTEMS + vespaScores.PRACTICE + vespaScores.ATTITUDE) / 5)
  vespaScores.OVERALL = overall

  const outcomeAverage = outcomeValues.length ? outcomeValues.reduce((s, n) => s + n, 0) / outcomeValues.length : 0

  return { vespaScores, categoryAverages, outcomeAverage }
}

export function validateResponses(responses: Record<string, number | undefined>, questions: Question[]) {
  const errors: string[] = []

  const unansweredVespa = questions.filter((q) => q.category !== 'OUTCOME').filter((q) => !responses[q.id])
  if (unansweredVespa.length > 0) errors.push(`Please answer all VESPA questions (${unansweredVespa.length} remaining)`)

  const unansweredOutcome = questions.filter((q) => q.category === 'OUTCOME').filter((q) => !responses[q.id])
  if (unansweredOutcome.length > 0) errors.push(`Please answer the outcome questions (${unansweredOutcome.length} remaining)`)

  for (const [qid, value] of Object.entries(responses)) {
    if (value === undefined) continue
    if (value < 1 || value > 5) errors.push(`Invalid response for question ${qid}: ${value}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    completionRate: (Object.keys(responses).length / questions.length) * 100,
  }
}

