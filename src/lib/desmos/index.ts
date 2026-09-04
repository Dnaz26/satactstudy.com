export { loadDesmos, prefetchDesmos, getDesmosApiKey } from './load'
export { DesmosMathTool } from './math-tool'
export {
  applyDesmosActions,
  parseDesmosChatResponse,
  parseAgentActions,
  parseCalculatorConfig,
  shouldShowCalculator,
  isMathSection,
  summarizeDesmos,
  DESMOS_TUTOR_INSTRUCTIONS,
} from './actions'
export {
  classifyDesmosQuestion,
  formatClassificationForTutor,
  DESMOS_STRATEGIES,
  APPROVED_STRATEGIES,
} from './strategies'
