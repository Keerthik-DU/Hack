export const INFRA_LAYER_VERSION = '0.1.0';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
