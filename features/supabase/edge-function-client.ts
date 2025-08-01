import { createClient } from '@supabase/supabase-js'

interface GenerateSevenStringRequest {
  ref_title: string
  caption: string
}

interface GenerateEmbeddingRequest {
  text: string
}

interface ProcessItemRequest {
  item_id: string
  ref_id: string
  creator: string
  item_text: string
  ref_title: string
}

interface RegenerateSpiritVectorRequest {
  user_id: string
}

interface GenerateSevenStringResponse {
  seven_string: string
}

interface GenerateEmbeddingResponse {
  embedding: number[]
}

interface ProcessItemResponse {
  success: boolean
  item_id: string
  seven_string: string
}

interface RegenerateSpiritVectorResponse {
  success: boolean
  user_id: string
  spirit_vector: string
}

class EdgeFunctionClient {
  private supabase: any
  private functionUrl: string

  constructor() {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPA_URL
    const supabaseKey = process.env.EXPO_PUBLIC_SUPA_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.functionUrl = `${supabaseUrl}/functions/v1/openai`
  }

  private async callFunction<T>(action: string, data: any): Promise<T> {
    const response = await fetch(this.functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPA_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        ...data,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Edge function error: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  async generateSevenString(
    request: GenerateSevenStringRequest
  ): Promise<GenerateSevenStringResponse> {
    return this.callFunction<GenerateSevenStringResponse>('generate_seven_string', request)
  }

  async generateEmbedding(request: GenerateEmbeddingRequest): Promise<GenerateEmbeddingResponse> {
    return this.callFunction<GenerateEmbeddingResponse>('generate_embedding', request)
  }

  async processItem(request: ProcessItemRequest): Promise<ProcessItemResponse> {
    return this.callFunction<ProcessItemResponse>('process_item', request)
  }

  async regenerateSpiritVector(
    request: RegenerateSpiritVectorRequest
  ): Promise<RegenerateSpiritVectorResponse> {
    return this.callFunction<RegenerateSpiritVectorResponse>('regenerate_spirit_vector', request)
  }
}

// Export singleton instance
export const edgeFunctionClient = new EdgeFunctionClient()

// Export types for use in other modules
export type {
  GenerateSevenStringRequest,
  GenerateEmbeddingRequest,
  ProcessItemRequest,
  RegenerateSpiritVectorRequest,
  GenerateSevenStringResponse,
  GenerateEmbeddingResponse,
  ProcessItemResponse,
  RegenerateSpiritVectorResponse,
}
