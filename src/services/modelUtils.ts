export interface ModelCapabilities {
  text: boolean;
  image: boolean;
  video: boolean;
  audio: boolean;
  tools?: boolean;
  parallelTools?: boolean;
}

export const parseModelCapabilities = (
  info: JsonObject,
): Partial<ModelCapabilities> => {
  const capabilities: Partial<ModelCapabilities> = {};
  const architecture =
    info.architecture && typeof info.architecture === "object"
      ? (info.architecture as JsonObject)
      : {};
  const supportedParameters =
    info.supported_parameters || info.supportedParameters || [];

  // Check modalities
  if (typeof architecture.modality === "string") {
    if (architecture.modality.includes("->text")) capabilities.text = true;
    if (architecture.modality.includes("->image")) capabilities.image = true;
    if (architecture.modality.includes("->audio")) capabilities.audio = true;
    if (architecture.modality.includes("->video")) capabilities.video = true;
  } else {
    const outputModalities =
      architecture.output_modalities || architecture.outputModalities;
    if (Array.isArray(outputModalities)) {
      if (outputModalities.includes("text")) capabilities.text = true;
      if (outputModalities.includes("image")) capabilities.image = true;
      if (outputModalities.includes("audio")) capabilities.audio = true;
      if (outputModalities.includes("video")) capabilities.video = true;
    }
  }

  // Check description or tags for tool support (heuristic)
  const description =
    typeof info.description === "string" ? info.description.toLowerCase() : "";
  const name = typeof info.name === "string" ? info.name.toLowerCase() : "";
  const contextLength =
    typeof info.context_length === "number"
      ? info.context_length
      : typeof info.contextLength === "number"
        ? info.contextLength
        : 0;

  if (
    description.includes("tool") ||
    description.includes("function calling") ||
    name.includes("tool") ||
    contextLength > 4000 // Basic heuristic
  ) {
    capabilities.tools = true;
  }

  if (name.includes("image")) {
    capabilities.image = true;
  }

  // Explicit check if available in data
  if (info.supports_tools === true) capabilities.tools = true;
  if (info.supports_parallel_function_calling === true)
    capabilities.parallelTools = true;

  // Check supported_parameters (OpenRouter/v1 standard)
  if (supportedParameters && supportedParameters instanceof Array) {
    if (supportedParameters.includes("tools")) capabilities.tools = true;
    if (supportedParameters.includes("tool_choice")) capabilities.tools = true;
  }

  return capabilities;
};
