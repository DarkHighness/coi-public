export interface ModelCapabilities {
  text: boolean;
  image: boolean;
  video: boolean;
  audio: boolean;
  tools?: boolean;
  parallelTools?: boolean;
}

export const parseModelCapabilities = (
  info: any,
): Partial<ModelCapabilities> => {
  const capabilities: Partial<ModelCapabilities> = {};
  const architecture = info.architecture || {};
  const supported_parameters = info.supported_parameters || {};

  // Check modalities
  if (architecture.modality) {
    if (architecture.modality.includes("->text")) capabilities.text = true;
    if (architecture.modality.includes("->image")) capabilities.image = true;
    if (architecture.modality.includes("->audio")) capabilities.audio = true;
    if (architecture.modality.includes("->video")) capabilities.video = true;
  } else if (architecture.output_modalities) {
    if (architecture.output_modalities.includes("text"))
      capabilities.text = true;
    if (architecture.output_modalities.includes("image"))
      capabilities.image = true;
    if (architecture.output_modalities.includes("audio"))
      capabilities.audio = true;
    if (architecture.output_modalities.includes("video"))
      capabilities.video = true;
  }

  // Check description or tags for tool support (heuristic)
  const description = (info.description || "").toLowerCase();
  const name = (info.name || "").toLowerCase();

  if (
    description.includes("tool") ||
    description.includes("function calling") ||
    name.includes("tool") ||
    info.context_length > 4000 // Basic heuristic: larger context often implies better capability
  ) {
    // Most modern large models support tools, but let's be specific if possible.
    // OpenRouter often doesn't explicitly flag tools in architecture.
    // We'll assume true for known providers/models if not explicitly denied.
    capabilities.tools = true;
  }

  if (name.includes("image")) {
    capabilities.image = true;
  }

  // Explicit check if available in data
  if (info.supports_tools) capabilities.tools = true;
  if (info.supports_parallel_function_calling)
    capabilities.parallelTools = true;

  // Check supported_parameters (OpenRouter/v1 standard)
  if (supported_parameters) {
    if (supported_parameters.includes("tools")) capabilities.tools = true;
    if (supported_parameters.includes("tool_choice")) capabilities.tools = true;
  }

  return capabilities;
};
