export interface LocalTransformersModelOption {
  id: string;
  label: string;
  dimensions: number;
  languages: string[];
  approxSizeMB: number;
  description: string;
}

export const DEFAULT_LOCAL_TRANSFORMERS_MODEL_ID = "Xenova/all-MiniLM-L6-v2";

export const LOCAL_TRANSFORMERS_MODEL_OPTIONS: LocalTransformersModelOption[] =
  [
    {
      id: "Xenova/all-MiniLM-L6-v2",
      label: "MiniLM L6 (Balanced)",
      dimensions: 384,
      languages: ["en"],
      approxSizeMB: 90,
      description: "Fast default model for general semantic search.",
    },
    {
      id: "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
      label: "MiniLM Multilingual (Recommended for zh)",
      dimensions: 384,
      languages: ["multilingual", "zh", "ja", "ko", "en"],
      approxSizeMB: 170,
      description: "Better multilingual retrieval quality with moderate size.",
    },
    {
      id: "Xenova/all-MiniLM-L12-v2",
      label: "MiniLM L12 (Higher Quality English)",
      dimensions: 384,
      languages: ["en"],
      approxSizeMB: 130,
      description: "Higher quality English embeddings with larger footprint.",
    },
    {
      id: "Xenova/all-mpnet-base-v2",
      label: "MPNet Base (Highest Quality, Heavy)",
      dimensions: 768,
      languages: ["en"],
      approxSizeMB: 420,
      description: "Higher retrieval quality, slower and significantly larger.",
    },
  ];

export const getLocalTransformersModelMeta = (
  modelId: string,
): LocalTransformersModelOption | undefined => {
  return LOCAL_TRANSFORMERS_MODEL_OPTIONS.find((item) => item.id === modelId);
};
