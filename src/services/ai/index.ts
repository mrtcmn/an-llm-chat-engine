export { AIService } from './ai.service'
export { default as aiPlugin } from './ai.plugin'
export { ToolRegistry } from './tool-library'
export { OpenAIProvider } from './strategies'

export type {
  AIMessage,
  AIResponse,
  AICompletionOptions,
  AIProvider,
  AITool,
  ToolCall,
  StreamChunk
} from './ai.types'
