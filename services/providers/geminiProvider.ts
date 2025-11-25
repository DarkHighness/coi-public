import { GoogleGenAI, Schema, Type, Modality } from "@google/genai";
import { ModelInfo } from "../../types";
import { convertJsonSchemaToGemini, JsonSchema } from "../schemaUtils";

export interface GeminiConfig {
  apiKey?: string;
  baseUrl?: string;
}

export const getGeminiClient = (config: GeminiConfig) =>
  new GoogleGenAI({
    apiKey: config.apiKey,
  });

export const validateConnection = async (
  config: GeminiConfig,
): Promise<void> => {
  try {
    const ai = getGeminiClient(config);
    await ai.models.list();
  } catch (e: any) {
    throw new Error(e.message || "Failed to connect to Gemini API");
  }
};

export const getModels = async (config: GeminiConfig): Promise<ModelInfo[]> => {
  try {
    const ai = getGeminiClient(config);
    const response = await ai.models.list();

    const models = [];
    for await (const model of response) {
      models.push(model);
    }

    return models
      .filter(
        (m) =>
          m.name.includes("gemini") ||
          m.name.includes("imagen") ||
          m.name.includes("veo"),
      )
      .map((m) => ({
        id: m.name.replace("models/", ""),
        name: m.displayName || m.name,
      }));
  } catch (e) {
    console.warn("Failed to list Gemini models", e);
    return [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-2.0-pro-exp-02-05", name: "Gemini 2.0 Pro" },
      { id: "imagen-3.0-generate-002", name: "Imagen 3" },
      { id: "veo-2.0-generate-001", name: "Veo 2" },
    ];
  }
};

export const generateContent = async (
  config: GeminiConfig,
  model: string,
  systemInstruction: string,
  contents: any[],
  schema?: JsonSchema,
  options?: {
    thinkingLevel?: "low" | "medium" | "high";
    mediaResolution?: "low" | "medium" | "high";
    temperature?: number;
    topP?: number;
    topK?: number;
    minP?: number;
    onChunk?: (text: string) => void;
    tools?: any[]; // Added tools support
  },
): Promise<{ result: any; usage: any; raw: any }> => {
  const ai = getGeminiClient(config);

  // Apply media resolution to image parts if specified
  const processedContents = options?.mediaResolution
    ? contents.map((content) => ({
        ...content,
        parts: content.parts.map((part: any) => {
          if (part.inlineData) {
            return {
              ...part,
              mediaResolution: {
                level: `media_resolution_${options.mediaResolution}`,
              },
            };
          }
          return part;
        }),
      }))
    : contents;

  // Convert standard JSON schema to Gemini schema if provided
  const geminiSchema = schema ? convertJsonSchemaToGemini(schema) : undefined;

  const generationConfig: any = {
    systemInstruction: systemInstruction,
    responseMimeType: "application/json",
    responseSchema: geminiSchema,
  };

  // If tools are provided, we cannot enforce JSON schema on the top level response easily
  // because the model might return a tool call instead of JSON.
  // So if tools are present, we remove responseMimeType/responseSchema unless we are sure.
  if (options?.tools) {
      delete generationConfig.responseMimeType;
      delete generationConfig.responseSchema;
      // Convert tools if necessary?
      // Tools in services/tools.ts are now standard JSON schema parameters.
      // Gemini expects FunctionDeclaration with Schema.
      // We need to map the tools to Gemini format.
      generationConfig.tools = options.tools.map((tool: any) => ({
        functionDeclarations: [{
          name: tool.name,
          description: tool.description,
          parameters: convertJsonSchemaToGemini(tool.parameters)
        }]
      }));
  }

  if (model.includes("thinking")) {
    generationConfig.thinkingConfig = { includeThoughts: true };
  } else {
    // Standard params
    if (options?.temperature !== undefined)
      generationConfig.temperature = options.temperature;
    if (options?.topP !== undefined) generationConfig.topP = options.topP;
    if (options?.topK !== undefined) generationConfig.topK = options.topK;
  }

  let text = "";
  let response;

  if (options?.onChunk) {
    const stream = await ai.models.generateContentStream({
      model: model,
      contents: processedContents,
      config: generationConfig,
    });

    for await (const chunk of stream) {
      const chunkText = chunk.text;
      if (chunkText) {
        text += chunkText;
        options.onChunk(chunkText);
      }
    }
    // For streaming, we might not get the full response object with usage metadata easily
    // unless the generator yields it at the end or we can access it otherwise.
    // We'll reconstruct a basic response object.
    response = {
      text: text,
      candidates: [{ finishReason: "STOP" }], // Assumed
    };
  } else {
    response = await ai.models.generateContent({
      model: model,
      contents: processedContents,
      config: generationConfig,
    });
    text = response.text || "";
  }

  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;

  // Check for tool calls
  const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

  if (functionCalls && functionCalls.length > 0) {
      const usage = {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      };
      return { result: { functionCalls }, usage, raw: response };
  }

  if (finishReason === "SAFETY") {
    throw new Error(
      "Gemini content generation failed: Safety filter triggered.",
    );
  }
  if (finishReason === "RECITATION") {
    throw new Error(
      "Gemini content generation failed: Recitation check triggered.",
    );
  }
  if (finishReason === "OTHER") {
    console.warn("Gemini content generation finished with reason: OTHER");
  }

  if (!text && finishReason !== "STOP")
    throw new Error(
      `No response from Gemini AI (Finish Reason: ${finishReason})`,
    );
  if (!text) throw new Error("No response from Gemini AI");

  // Extract Usage
  const usage = {
    promptTokens: response.usageMetadata?.promptTokenCount || 0,
    completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
    totalTokens: response.usageMetadata?.totalTokenCount || 0,
  };

    try {
    // Clean JSON before parsing (remove markdown code blocks if present)
    const cleanedText = text.replace(/```json\n?|```/g, "").trim();
    return { result: JSON.parse(cleanedText), usage, raw: response };
  } catch (e) {
    console.warn("Initial JSON parse failed, attempting repair...", e);
    try {
      const cleanedText = text.replace(/```json\n?|```/g, "").trim();
      // Attempt simple repairs
      const repairedText = cleanedText
        // Replace single quotes around keys: { 'key': -> { "key":
        .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
        // Remove trailing commas: , } -> }
        .replace(/,(\s*[}\]])/g, "$1");

      return { result: JSON.parse(repairedText), usage, raw: response };
    } catch (e2) {
      console.error("JSON Parse Error", e2, "Text:", text);
      throw new Error("Failed to parse AI response as JSON.");
    }
  }
};

export const generateImage = async (
  config: GeminiConfig,
  model: string,
  prompt: string,
  resolution: string = "1024x1024",
): Promise<{ url: string | null; usage?: any; raw?: any }> => {
  const ai = getGeminiClient(config);

  // Map resolution to aspect ratio
  let aspectRatio = "1:1";
  switch (resolution) {
    case "1024x1024":
      aspectRatio = "1:1";
      break;
    case "832x1248":
      aspectRatio = "2:3";
      break;
    case "1248x832":
      aspectRatio = "3:2";
      break;
    case "864x1184":
      aspectRatio = "3:4";
      break;
    case "1184x864":
      aspectRatio = "4:3";
      break;
    case "896x1152":
      aspectRatio = "4:5";
      break;
    case "1152x896":
      aspectRatio = "5:4";
      break;
    case "768x1344":
      aspectRatio = "9:16";
      break;
    case "1344x768":
      aspectRatio = "16:9";
      break;
    case "1536x672":
      aspectRatio = "21:9";
      break;
    default:
      aspectRatio = "1:1";
      break;
  }

  try {
    const response = await ai.models.generateImages({
      model: model,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio,
        outputMimeType: "image/jpeg",
        personGeneration: "allow_adult" as any,
      },
    });

    const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    const url = imageBytes ? `data:image/jpeg;base64,${imageBytes}` : null;
    return {
      url,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      raw: response,
    };
  } catch (error: any) {
    if (
      error.message?.includes("429") ||
      error.status === "RESOURCE_EXHAUSTED"
    ) {
      console.warn("Gemini Image Generation Quota Exceeded (429).");
      return { url: null, usage: undefined, raw: error };
    }
    throw error;
  }
};

export const generateVideo = async (
  config: GeminiConfig,
  model: string,
  imageBase64: string,
  prompt: string,
): Promise<{ url: string; usage?: any; raw?: any }> => {
  const ai = getGeminiClient(config);
  const [header, data] = imageBase64.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";

  let operation = await ai.models.generateVideos({
    model: model,
    prompt: prompt,
    image: {
      imageBytes: data,
      mimeType: mimeType,
    },
    config: {
      numberOfVideos: 1,
      resolution: "720p",
      aspectRatio: "16:9",
    },
  });

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({
      operation: operation,
    });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("No video URI returned");

  const response = await fetch(`${videoUri}&key=${config.apiKey}`);
  const blob = await response.blob();
  return {
    url: URL.createObjectURL(blob),
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    raw: operation,
  };
};

export const generateSpeech = async (
  config: GeminiConfig,
  model: string,
  text: string,
  voiceName: string = "Kore",
  options?: {
    speed?: number;
    format?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
    instructions?: string; // Used for narrative tone
  },
): Promise<{ audio: ArrayBuffer; usage?: any; raw?: any }> => {
  const ai = getGeminiClient(config);

  // Gemini TTS Control via Prompting
  // Docs: "Say in an spooky whisper: ..."
  let processedText = text;
  if (options?.instructions) {
    // If instructions (tone) are provided, prepend them
    // Clean up instructions to ensure it fits the pattern "Say in a [tone] tone:" or similar
    // The user passes "cheerful", "sad", etc.
    processedText = `Say in a ${options.instructions} tone: "${text}"`;
  }

  // Use the specific TTS model if the generic one is passed, or respect the passed model if it's already a TTS model
  const ttsModel = model.includes("tts")
    ? model
    : "gemini-2.5-flash-preview-tts";

  const response = await ai.models.generateContent({
    model: ttsModel,
    contents: [{ parts: [{ text: processedText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio content generated");

  const usage = {
    promptTokens: response.usageMetadata?.promptTokenCount || 0,
    completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
    totalTokens: response.usageMetadata?.totalTokenCount || 0,
  };

  // Convert base64 to Uint8Array
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Check for WAV or MP3 header
  // WAV: RIFF (52 49 46 46)
  // MP3: ID3 (49 44 33) or Sync Word (FF FB / FF F3 etc)
  const isWav =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;
  const isMp3 =
    (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // ID3
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0); // Sync word

  if (isWav || isMp3) {
    return { audio: bytes.buffer, usage, raw: response };
  }

  // If raw PCM, wrap in WAV header
  // Default Gemini PCM is 24kHz, 1 channel, 16-bit
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + bytes.length, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  /* bits per sample */
  view.setUint16(34, bitsPerSample, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, bytes.length, true);

  const wavBytes = new Uint8Array(wavHeader.byteLength + bytes.byteLength);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(bytes, wavHeader.byteLength);

  return { audio: wavBytes.buffer, usage, raw: response };
};

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
