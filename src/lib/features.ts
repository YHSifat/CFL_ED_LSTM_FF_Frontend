/** Pages that are built but switched off. Flip to true to bring one back. */
export const FEATURES = {
  /** /models: CFL-EDLSTM vs baseline models (still sample data). */
  modelComparison: false,
  /** /explainability: SHAP feature importance (still sample data). */
  explainability: false,
} as const;
