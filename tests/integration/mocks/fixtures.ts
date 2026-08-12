import type { Finding } from '../../../src/types';

export const highRegexFinding: Finding = {
  id: 'hr1', secretType: 'aws_access_key', confidence: 'high', lineNumber: 1,
  startColumn: 0, endColumn: 20, maskedValue: 'AKIA***REAL', detectionLayer: 1, patternId: 'aws',
};
export const mediumEntropyFinding: Finding = {
  id: 'me1', secretType: 'api_key', confidence: 'medium', lineNumber: 2,
  startColumn: 0, endColumn: 24, maskedValue: 'xxxx***yyyy', detectionLayer: 3, patternId: 'ent',
};
export const overlappingEntropy: Finding = {
  id: 'ov1', secretType: 'aws_access_key', confidence: 'medium', lineNumber: 1,
  startColumn: 0, endColumn: 20, maskedValue: 'AKIA***REAL', detectionLayer: 3, patternId: 'ent',
};
