export interface AppInfo {
  name: string;
  version: string;
  status: 'idle' | 'ready' | 'scanning';
}

export type SecurityLevel = 'high' | 'medium' | 'low';
