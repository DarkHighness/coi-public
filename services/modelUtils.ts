export interface ModelCapabilities {
  text: boolean;
  image: boolean;
  video: boolean;
  audio: boolean;
}

export const parseModelCapabilities = (
  architecture: any,
): Partial<ModelCapabilities> => {
  const capabilities: Partial<ModelCapabilities> = {};

  if (architecture) {
    const { modality, output_modalities } = architecture;
    if (output_modalities) {
      if (output_modalities.includes("text")) capabilities.text = true;
      if (output_modalities.includes("image")) capabilities.image = true;
      if (output_modalities.includes("audio")) capabilities.audio = true;
      if (output_modalities.includes("video")) capabilities.video = true;
    } else if (modality) {
      if (modality.includes("->text")) capabilities.text = true;
      if (modality.includes("->image")) capabilities.image = true;
      if (modality.includes("->audio")) capabilities.audio = true;
      if (modality.includes("->video")) capabilities.video = true;
    }
  }

  return capabilities;
};
