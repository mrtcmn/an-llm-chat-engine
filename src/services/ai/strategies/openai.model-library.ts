/**
 * OpenAI Model Library
 * Central configuration for supported OpenAI models
 * 
 */

export interface ModelConfig {
  name: string
  isDefault: boolean
  options?: {
    maxTokens?: number
    temperature?: number
    topP?: number
    frequencyPenalty?: number
    presencePenalty?: number
  }
}

export interface ModelLibrary {
  models: ModelConfig[]
}

export const modelLibrary: ModelLibrary = {
  models: [
    {
      name: 'gpt-4o-mini',
      isDefault: true,
      options: {
        maxTokens: 2048,
        temperature: 1.0,
        topP: 1.0,
        frequencyPenalty: 0,
        presencePenalty: 0
      }
    }
  ]
}

// Helper to get default model
export const getDefaultModel = (): ModelConfig | undefined => {
  return modelLibrary.models.find(m => m.isDefault)
}

// Helper to get model by name
export const getModelByName = (name: string): ModelConfig | undefined => {
  return modelLibrary.models.find(m => m.name === name)
}
