import fs from 'fs';
import path from 'path';
import { TestFixture } from '../fixtures/schema';

/**
 * Loads and parses secret detection test fixtures from a JSON file.
 * @param filePath Path to JSON fixture file relative to project root or absolute
 * @returns Array of parsed TestFixture objects
 */
export function loadFixtures(
  filePath: string = './src/test/fixtures/secrets/sample-secrets.json'
): TestFixture[] {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const rawData = fs.readFileSync(absolutePath, 'utf-8');
  const parsed = JSON.parse(rawData) as unknown[];

  return parsed.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Invalid fixture format at index ${index}`);
    }
    const fixture = item as TestFixture;
    if (!fixture.id || !fixture.input || !Array.isArray(fixture.expectedFindings)) {
      throw new Error(`Invalid TestFixture structure for id "${fixture.id ?? index}"`);
    }
    return fixture;
  });
}
