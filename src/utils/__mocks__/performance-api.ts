export interface MockPerformanceEntry {
  name: string;
  entryType: string;
  initiatorType: string;
  duration: number;
}

export function mockCleanPerformanceEntries(): MockPerformanceEntry[] {
  return [
    {
      name: 'http://localhost:5173/src/main.tsx',
      entryType: 'resource',
      initiatorType: 'script',
      duration: 12,
    },
    {
      name: 'http://localhost:5173/src/styles/globals.css',
      entryType: 'resource',
      initiatorType: 'link',
      duration: 8,
    },
  ];
}

export function mockDirtyPerformanceEntries(count = 2): MockPerformanceEntry[] {
  const entries: MockPerformanceEntry[] = mockCleanPerformanceEntries();
  for (let i = 0; i < count; i++) {
    entries.push({
      name: `https://api.thirdparty-analytics.com/track-${i + 1}`,
      entryType: 'resource',
      initiatorType: 'fetch',
      duration: 120,
    });
  }
  return entries;
}
