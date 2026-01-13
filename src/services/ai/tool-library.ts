import type { AITool } from './ai.types'

/**
 * Mock weather tool for demonstration
 */
const getCurrentWeatherTool: AITool = {
  name: 'getCurrentWeather',
  description: 'Get the current weather for a location. Returns temperature, condition, and humidity.',
  parameters: {
    type: 'object',
    required: ['location'],
    properties: {
      location: {
        type: 'string',
        description: 'City name, e.g. "San Francisco" or "New York"'
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature unit (defaults to fahrenheit)'
      }
    }
  },
  execute: async (params: Record<string, unknown>) => {
    const location = params.location as string
    const unit = (params.unit as string) || 'fahrenheit'

    // Mock implementation - returns fake weather data
    const conditions = ['sunny', 'cloudy', 'partly cloudy', 'rainy', 'stormy']
    const condition = conditions[Math.floor(Math.random() * conditions.length)]

    // Generate temperature based on unit
    const tempF = Math.floor(Math.random() * 40) + 50 // 50-90F
    const temperature = unit === 'celsius'
      ? Math.round((tempF - 32) * 5 / 9)
      : tempF

    return {
      location,
      temperature,
      unit,
      condition,
      humidity: Math.floor(Math.random() * 50) + 30, // 30-80%
      windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 mph
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Tool Registry
 * Manages available AI tools and provides OpenAI-compatible definitions
 */
export class ToolRegistry {
  private tools: Map<string, AITool> = new Map()

  constructor() {
    // Register default tools
    this.register(getCurrentWeatherTool)
  }

  register(tool: AITool): void {
    this.tools.set(tool.name, tool)
  }

  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  get(name: string): AITool | undefined {
    return this.tools.get(name)
  }

  getAll(): AITool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tool definitions in OpenAI function calling format
   */
  getOpenAIToolDefinitions(): Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }> {
    return this.getAll().map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }

  /**
   * Execute a tool by name with given arguments
   */
  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.get(name)
    if (!tool) {
      throw new Error(`Tool "${name}" not found`)
    }
    return tool.execute(args)
  }
}
