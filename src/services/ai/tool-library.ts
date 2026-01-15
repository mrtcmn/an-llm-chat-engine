import { z } from 'zod'
import { tool } from 'ai'
import type { CoreTool } from 'ai'

/**
 * Weather tool using zod schema for AI SDK
 */
const getCurrentWeatherTool = tool({
  description: 'Get the current weather for a location. Returns temperature, condition, and humidity.',
  parameters: z.object({
    location: z.string().describe('City name, e.g. "San Francisco" or "New York"'),
    unit: z.enum(['celsius', 'fahrenheit']).describe('Temperature unit')
  }),
  execute: async ({ location, unit = 'celsius' }) => {
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
})

/**
 * Tool Registry
 * Manages available AI tools for AI SDK
 */
export class ToolRegistry {
  private tools: Map<string, CoreTool> = new Map()

  constructor() {
    // Register default tools
    this.register('getCurrentWeather', getCurrentWeatherTool)
  }

  register(name: string, tool: CoreTool): void {
    this.tools.set(name, tool)
  }

  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  get(name: string): CoreTool | undefined {
    return this.tools.get(name)
  }

  /**
   * Get all tools as a record for AI SDK
   */
  getTools(): Record<string, CoreTool> {
    return Object.fromEntries(this.tools)
  }
}
