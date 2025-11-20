
import OpenAI from 'openai';
import { ModelInfo } from "../../types";

export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  modelId: string;
}

const getClient = (config: OpenAIConfig) => {
  return new OpenAI({
    apiKey: config.apiKey || 'dummy', // SDK requires key, even if empty/dummy for custom endpoints
    baseURL: config.baseUrl,
    dangerouslyAllowBrowser: true
  });
};

export const validateOpenAIConnection = async (config: OpenAIConfig): Promise<void> => {
  try {
    const client = getClient(config);
    await client.models.list();
  } catch (e: any) {
    throw new Error(e.message || "Failed to connect to OpenAI API");
  }
};

export const fetchOpenAIModels = async (config: OpenAIConfig): Promise<ModelInfo[]> => {
  try {
    const client = getClient(config);
    const list = await client.models.list();
    return list.data.map((m) => ({
      id: m.id,
      name: m.id
    }));
  } catch (e) {
    console.warn("Failed to list OpenAI models", e);
    return [
       { id: 'gpt-4o', name: 'GPT-4o' },
       { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
       { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ];
  }
};

export const fetchOpenAICompletion = async (
  config: OpenAIConfig,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  schema?: any // Strict JSON Schema
): Promise<any> => {
  const client = getClient(config);

  // Format messages for OpenAI SDK
  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  ];

  const response = await client.chat.completions.create({
    model: config.modelId,
    messages: chatMessages,
    response_format: schema ? { type: 'json_schema', json_schema: schema } : { type: 'json_object' },
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No content returned from OpenAI");

  const result = JSON.parse(content);

  // Normalize Usage
  const usage = {
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
    totalTokens: response.usage?.total_tokens || 0
  };

  return { result, usage, raw: response };
};

export const generateOpenAIImage = async (
  config: OpenAIConfig,
  prompt: string
): Promise<{ url: string | null, usage?: any, raw?: any }> => {
  const client = getClient(config);
  const response = await client.images.generate({
    model: config.modelId || 'dall-e-3',
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json"
  });

  const b64 = response.data[0]?.b64_json;
  const url = b64 ? `data:image/png;base64,${b64}` : null;

  // OpenAI Image generation doesn't return standard token usage, but we can log the request
  return { url, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, raw: response };
};

export const generateOpenAISpeech = async (
  config: OpenAIConfig,
  text: string
): Promise<{ audio: string, usage?: any, raw?: any }> => {
  const client = getClient(config);
  const response = await client.audio.speech.create({
    model: config.modelId || 'tts-1',
    input: text,
    voice: 'alloy',
    response_format: 'mp3' // or 'pcm' if supported in future, 'mp3' acts as binary
  });

  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return { audio: btoa(binary), usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
};