/**
 * Feature flags for the additive insight features.
 * All default ON. Flip a flag to false to hide that feature without
 * deleting any code; existing behaviour is untouched either way.
 */
export const FEATURE_FLAGS = {
  /** Scam Signals checklist rendered under the prediction result */
  scamSignalsPanel: true,
  /** "Why was this flagged?" word-highlight explainability panel */
  whyFlaggedPanel: true,
  /** Cost-sensitive fraud threshold slider */
  thresholdControl: true,
  /** /insights Model Insights page and its nav link */
  modelInsightsPage: true,
} as const;
