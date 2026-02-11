declare module "*.toml" {
  const value: unknown;
  export default value;
}

declare module "@tensorflow/tfjs-backend-webgpu" {}
declare module "@tensorflow/tfjs-backend-webgl" {}
declare module "@tensorflow/tfjs-backend-cpu" {}

declare module "@tensorflow/tfjs-core" {
  export interface TensorLike {
    array(): Promise<unknown>;
    dispose(): void;
  }

  export function setBackend(backendName: string): Promise<boolean>;
  export function ready(): Promise<void>;
  export function getBackend(): string;
}

declare module "@tensorflow-models/universal-sentence-encoder" {
  export interface UniversalSentenceEncoderModel {
    embed(inputs: string[] | string): Promise<{
      array(): Promise<number[][]>;
      dispose(): void;
    }>;
    dispose?: () => void;
  }

  export function load(): Promise<UniversalSentenceEncoderModel>;
}
