import { OpenRouter } from '@openrouter/sdk';
import { ModelInfo } from "../../types";
import { fetchOpenAICompletion, generateOpenAIImage, generateOpenAISpeech } from "./openaiProvider";

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
}

export const validateOpenRouterConnection = async (config: OpenRouterConfig): Promise<void> => {
  try {
    const response = await fetch(`${config.baseUrl || 'https://openrouter.ai/api/v1'}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText}`);
    }
  } catch (e: any) {
    throw new Error(e.message || "Failed to connect to OpenRouter API");
  }
};

export const fetchOpenRouterModels = async (config: OpenRouterConfig): Promise<ModelInfo[]> => {
  try {
    const response = await fetch(`${config.baseUrl || 'https://openrouter.ai/api/v1'}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const json = await response.json();

    return json.data.map((m: any) => {
      const capabilities = {
        text: false,
        image: false,
        video: false,
        audio: false
      };

      // Parse architecture
      if (m.architecture) {
          const { modality, output_modalities } = m.architecture;

          if (output_modalities) {
              if (output_modalities.includes('text')) capabilities.text = true;
              if (output_modalities.includes('image')) capabilities.image = true;
              if (output_modalities.includes('audio')) capabilities.audio = true;
              if (output_modalities.includes('video')) capabilities.video = true;
          } else if (modality) {
             // Fallback if output_modalities is missing but modality string exists
             if (modality.includes('->text')) capabilities.text = true;
             if (modality.includes('->image')) capabilities.image = true;
             if (modality.includes('->audio')) capabilities.audio = true;
             if (modality.includes('->video')) capabilities.video = true;
          }
      } else {
          // Fallback to ID heuristics if architecture is missing
          const id = m.id.toLowerCase();
          if (id.includes('dall-e') || id.includes('stable-diffusion') || id.includes('flux') || id.includes('midjourney')) capabilities.image = true;
          else capabilities.text = true; // Default to text
      }

      // Ensure at least one capability is true (default to text if nothing else found)
      if (!capabilities.text && !capabilities.image && !capabilities.video && !capabilities.audio) {
          capabilities.text = true;
      }

      return {
        id: m.id,
        name: m.name || m.id,
        capabilities
      };
    });
  } catch (e) {
    console.warn("Failed to list OpenRouter models", e);
    return [];
  }
};

export const generateOpenRouterCompletion = async (
    config: OpenRouterConfig,
    modelId: string,
    messages: any[],
    schema?: any
): Promise<{ result: any }> => {
    const body: any = {
        model: modelId,
        messages: messages,
    };

    if (schema) {
        body.response_format = {
            type: 'json_schema',
            json_schema: {
                name: 'response',
                strict: true,
                schema: schema
            }
        };
    }

    try {
        const response = await fetch(`${config.baseUrl || 'https://openrouter.ai/api/v1'}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin, // Optional: To identify your app
                'X-Title': 'Chronicles of Infinity' // Optional: To identify your app
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `OpenRouter API Error: ${response.status}`);
        }

        const result = await response.json();
        let content = result.choices[0]?.message?.content || "";

        if (schema) {
            try {
                // Attempt to find JSON block if wrapped in markdown
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    content = jsonMatch[0];
                }
                return { result: JSON.parse(content) };
            } catch (e) {
                console.error("Failed to parse OpenRouter JSON", content);
                return { result: {} };
            }
        }

        return { result: content };
    } catch (e: any) {
        console.error("OpenRouter generation failed", e);
        throw new Error(e.message || "OpenRouter generation failed");
    }
}

// Legacy wrappers if needed, or we can update geminiService to use generateOpenRouterCompletion directly
export const generateOpenRouterJson = async (
  config: OpenRouterConfig,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[],
  schema?: any
) => {
    // Convert system prompt to message if needed
    const allMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];
    return generateOpenRouterCompletion(config, model, allMessages, schema);
};

export const generateOpenRouterImage = async (
  config: OpenRouterConfig,
  model: string,
  prompt: string,
  resolution: string = "1024x1024"
) => {
  // Determine Aspect Ratio / Size based on resolution string
  let size = resolution;
  let aspectRatio = "1:1";

  switch (resolution) {
    case "1024x1024": aspectRatio = "1:1"; break;
    case "832x1248": aspectRatio = "2:3"; break;
    case "1248x832": aspectRatio = "3:2"; break;
    case "864x1184": aspectRatio = "3:4"; break;
    case "1184x864": aspectRatio = "4:3"; break;
    case "896x1152": aspectRatio = "4:5"; break;
    case "1152x896": aspectRatio = "5:4"; break;
    case "768x1344": aspectRatio = "9:16"; break;
    case "1344x768": aspectRatio = "16:9"; break;
    case "1536x672": aspectRatio = "21:9"; break;
    default: aspectRatio = "1:1"; break;
  }

  const body: any = {
    model: model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    // @ts-ignore
    // OpenRouter specific: some models support 'modalities' param, others infer from model ID
    // But for image generation via chat/completions (which OpenRouter often uses for unified interface),
    // we might need to check if it's a direct image endpoint or chat.
    // However, OpenRouter documentation suggests using standard OpenAI image endpoint structure for image models?
    // Actually, OpenRouter unifies everything under chat/completions for some models, but for DALL-E it might proxy to OpenAI's image endpoint.
    // Let's try the standard OpenAI Image Generation endpoint structure first, but sent to OpenRouter.
  };

  // Provider-specific handling
  if (model.toLowerCase().includes('gemini')) {
      // Gemini via OpenRouter uses image_config.aspect_ratio
      // And it uses chat/completions endpoint usually?
      // Let's assume we use chat/completions for Gemini Image Gen on OpenRouter
      // as per their docs for some models.
      // Wait, if we use the /images/generations endpoint, we should follow OpenAI format.
      // If we use /chat/completions, we follow chat format.

      // Let's try /chat/completions for everything first as OpenRouter is "Unified".
      // But wait, the error user saw was for `https://openrouter.ai/api/v1/images/generations`.
      // So the previous code WAS using the image endpoint (via OpenAI SDK or OpenRouter SDK).

      // If we want to fix CORS, we must use fetch.
      // And we should probably use the /chat/completions endpoint if the model supports it for images (like Gemini),
      // OR use /images/generations if it's a DALL-E like model.

      // However, OpenRouter docs say: "For image generation models... use the /images/generations endpoint".

      // Let's construct the body for /images/generations
      const imageBody: any = {
          model: model,
          prompt: prompt,
          n: 1,
      };

      if (model.toLowerCase().includes('gemini')) {
           // Gemini on OpenRouter might need special handling or might not be supported via /images/generations?
           // Actually, OpenRouter supports Gemini via chat completions for text, but for images?
           // Let's assume standard OpenAI image body for now, but with mapped size.
           // Gemini doesn't support 'size' param in OpenAI format usually, it supports aspect ratio.
           // But OpenRouter might map it.
           // Let's stick to the previous logic but use fetch.

           // Previous logic for Gemini:
           // body.image_config = { aspect_ratio: aspectRatio }
           // This looks like a chat completion body extension?
           // If so, we should hit /chat/completions.

           // Let's try hitting /chat/completions for Gemini models, and /images/generations for others.

           const chatBody = {
               model: model,
               messages: [{ role: 'user', content: prompt }],
               // @ts-ignore
               image_config: { aspect_ratio: aspectRatio }
           };

           const response = await fetch(`${config.baseUrl || 'https://openrouter.ai/api/v1'}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Chronicles of Infinity'
                },
                body: JSON.stringify(chatBody)
           });

           if (!response.ok) throw new Error(`OpenRouter API Error: ${response.status}`);
           const result = await response.json();
           // Gemini via OpenRouter chat completion returns image in content or as a separate field?
           // Usually it returns a markdown link or similar.
           // Let's assume it returns standard chat completion with image url in content or attachment.
           // Actually, the previous code: result.choices[0].message.images[0].image_url.url
           // This implies a specific response format.

           if (result.choices && result.choices[0].message.images && result.choices[0].message.images.length > 0) {
                return {
                    url: result.choices[0].message.images[0].image_url.url,
                    raw: result,
                    usage: result.usage
                };
           }
           // Fallback if it returns text url
           const content = result.choices[0]?.message?.content;
           const urlMatch = content?.match(/https?:\/\/[^\s)]+/);
           if (urlMatch) return { url: urlMatch[0], raw: result, usage: result.usage };

           throw new Error("No image generated");

      } else {
          // Standard OpenAI/Other uses size
          if (model.toLowerCase().includes('dall-e-3')) {
              if (aspectRatio === "1:1") size = "1024x1024";
              else if (["2:3", "3:4", "4:5", "9:16"].includes(aspectRatio)) size = "1024x1792";
              else if (["3:2", "4:3", "5:4", "16:9", "21:9"].includes(aspectRatio)) size = "1792x1024";
              else size = "1024x1024";
          }

          imageBody.size = size;
          imageBody.response_format = "b64_json"; // Prefer base64 to avoid hotlinking issues if possible, or url.
          // OpenRouter might not support b64_json for all models. Let's use url default.
          delete imageBody.response_format;

          const response = await fetch(`${config.baseUrl || 'https://openrouter.ai/api/v1'}/images/generations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Chronicles of Infinity'
                },
                body: JSON.stringify(imageBody)
           });

           if (!response.ok) {
               const err = await response.json().catch(() => ({}));
               throw new Error(err.error?.message || `OpenRouter Image API Error: ${response.status}`);
           }

           const result = await response.json();
           return {
               url: result.data[0].url,
               raw: result,
               usage: undefined
           };
      }
  }

  return { url: null }; // Should not reach here
};

export const generateOpenRouterSpeech = async (
  config: OpenRouterConfig,
  model: string,
  text: string
) => {
  // SDK doesn't seem to support audio yet, fallback to OpenAI provider
  return generateOpenAISpeech(
    { apiKey: config.apiKey, baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1', modelId: model },
    text
  );
};
