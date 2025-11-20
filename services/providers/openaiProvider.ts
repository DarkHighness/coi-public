
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
    return list.data.map((m: any) => {
      const id = m.id.toLowerCase();
      const capabilities = {
        text: false,
        image: false,
        video: false,
        audio: false
      };

      // 1. Try to detect from OpenRouter-style 'architecture' fields
      if (m.architecture) {
          const { modality, output_modalities } = m.architecture;
          if (output_modalities) {
              if (output_modalities.includes('text')) capabilities.text = true;
              if (output_modalities.includes('image')) capabilities.image = true;
              if (output_modalities.includes('audio')) capabilities.audio = true;
              if (output_modalities.includes('video')) capabilities.video = true;
          } else if (modality) {
             if (modality.includes('->text')) capabilities.text = true;
             if (modality.includes('->image')) capabilities.image = true;
             if (modality.includes('->audio')) capabilities.audio = true;
             if (modality.includes('->video')) capabilities.video = true;
          }
      }

      // 2. Fallback to ID heuristics if no capabilities detected yet (or to augment)
      const hasExplicitInfo = capabilities.text || capabilities.image || capabilities.video || capabilities.audio;

      if (!hasExplicitInfo) {
          // Image
          if (id.includes('dall-e') || id.includes('stable-diffusion') || id.includes('flux') || id.includes('midjourney') || id.includes('image')) {
              capabilities.image = true;
          }
          // Audio
          if (id.includes('tts') || id.includes('whisper') || id.includes('audio')) {
              capabilities.audio = true;
          }
          // Video
          if (id.includes('sora') || id.includes('video') || id.includes('runway') || id.includes('luma')) {
              capabilities.video = true;
          }

          // Text (Default)
          // If it's not explicitly another modality, or if it matches known LLM patterns
          if (capabilities.image || capabilities.audio || capabilities.video) {
              // If it has other capabilities, check if it's also text (multimodal)
              if (id.startsWith('gpt') || id.includes('chat') || id.includes('claude') || id.includes('gemini') || id.includes('llama') || id.includes('mistral')) {
                  capabilities.text = true;
              }
          } else {
              // If no other capability detected, assume text
              capabilities.text = true;
          }
      }

      return {
        id: m.id,
        name: m.name || m.id,
        capabilities
      };
    });
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
  // We allow 'system' roles in the messages array to support dynamic context injection
  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role as any, content: m.content }))
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
  prompt: string,
  resolution: string = "1024x1024"
): Promise<{ url: string | null, usage?: any, raw?: any }> => {
  const client = getClient(config);

  let size: any = resolution;

  // DALL-E 3 requires specific sizes
  if (config.modelId?.includes('dall-e-3')) {
      // Map new resolutions to DALL-E 3 supported sizes
      // Portrait: 2:3, 3:4, 4:5, 9:16 -> 1024x1792
      if (["832x1248", "864x1184", "896x1152", "768x1344"].includes(resolution)) {
          size = "1024x1792";
      }
      // Landscape: 3:2, 4:3, 5:4, 16:9, 21:9 -> 1792x1024
      else if (["1248x832", "1184x864", "1152x896", "1344x768", "1536x672"].includes(resolution)) {
          size = "1792x1024";
      }
      // Square: 1:1 -> 1024x1024
      else {
          size = "1024x1024";
      }
  } else {
      // DALL-E 2 only supports squares (256, 512, 1024)
      // Since our UI only provides non-standard squares or high-res rectangles, we default to 1024x1024
      size = "1024x1024";
  }

  const response = await client.images.generate({
    model: config.modelId || 'dall-e-3',
    prompt: prompt,
    n: 1,
    size: size,
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