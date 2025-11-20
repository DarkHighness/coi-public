
import { GoogleGenAI, Schema, Type, Modality } from "@google/genai";
import { ModelInfo } from "../../types";

export interface GeminiConfig {
  apiKey?: string;
  baseUrl?: string;
}

export const getGeminiClient = (config: GeminiConfig) => new GoogleGenAI({
  apiKey: config.apiKey
});

export const validateGeminiConnection = async (config: GeminiConfig): Promise<void> => {
  try {
    const ai = getGeminiClient(config);
    await ai.models.list();
  } catch (e: any) {
    throw new Error(e.message || "Failed to connect to Gemini API");
  }
};

export const fetchGeminiModels = async (config: GeminiConfig): Promise<ModelInfo[]> => {
  try {
    const ai = getGeminiClient(config);
    const response = await ai.models.list();

    const models = [];
    for await (const model of response) {
      models.push(model);
    }

    return models
      .filter(m => m.name.includes('gemini') || m.name.includes('imagen') || m.name.includes('veo'))
      .map(m => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name
      }));
  } catch (e) {
    console.warn("Failed to list Gemini models", e);
    return [
      { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'imagen-4.0-generate-001', name: 'Imagen 3' },
      { id: 'veo-3.1-fast-generate-preview', name: 'Veo' }
    ];
  }
};

export const generateGeminiJson = async (
  config: GeminiConfig,
  model: string,
  contents: any[],
  systemInstruction: string,
  responseSchema?: Schema
): Promise<any> => {
  const ai = getGeminiClient(config);
  const response = await ai.models.generateContent({
    model: model,
    contents: contents,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.8,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini AI");

  // Extract Usage
  const usage = {
    promptTokens: response.usageMetadata?.promptTokenCount || 0,
    completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
    totalTokens: response.usageMetadata?.totalTokenCount || 0
  };

  return { result: JSON.parse(text), usage, raw: response };
};

export const generateGeminiImage = async (
  config: GeminiConfig,
  model: string,
  prompt: string
): Promise<{ url: string | null, usage?: any, raw?: any }> => {
  const ai = getGeminiClient(config);
  try {
    const response = await ai.models.generateImages({
      model: model,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "16:9",
        outputMimeType: "image/jpeg",
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    const url = imageBytes ? `data:image/jpeg;base64,${imageBytes}` : null;
    return { url, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, raw: response };
  } catch (error: any) {
    if (error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
       console.warn("Gemini Image Generation Quota Exceeded (429).");
       return { url: null, usage: undefined, raw: error };
    }
    throw error;
  }
};

export const generateGeminiVideo = async (
  config: GeminiConfig,
  model: string,
  imageBase64: string,
  prompt: string
): Promise<{ url: string, usage?: any, raw?: any }> => {
  const ai = getGeminiClient(config);
  const [header, data] = imageBase64.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

  let operation = await ai.models.generateVideos({
    model: model,
    prompt: prompt,
    image: {
      imageBytes: data,
      mimeType: mimeType,
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("No video URI returned");

  const response = await fetch(`${videoUri}&key=${config.apiKey}`);
  const blob = await response.blob();
  return { url: URL.createObjectURL(blob), usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, raw: operation };
};

export const generateGeminiSpeech = async (
  config: GeminiConfig,
  model: string,
  text: string,
  voiceName: string = 'Kore'
): Promise<{ audio: string, usage?: any, raw?: any }> => {
  const ai = getGeminiClient(config);
  const response = await ai.models.generateContent({
    model: model,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio content generated");

  const usage = {
    promptTokens: response.usageMetadata?.promptTokenCount || 0,
    completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
    totalTokens: response.usageMetadata?.totalTokenCount || 0
  };

  return { audio: base64Audio, usage, raw: response };
};