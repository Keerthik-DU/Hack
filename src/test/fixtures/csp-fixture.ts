/**
 * CSP Test Fixture File containing expected CSP string andParsed Directives for validation tests.
 */
import { REQUIRED_CSP_DIRECTIVES, getCspHeaderString } from '../../config/csp';

export const EXPECTED_CSP_HEADER = getCspHeaderString();

export const EXPECTED_CSP_FIXTURE = {
  rawHeader: EXPECTED_CSP_HEADER,
  directives: REQUIRED_CSP_DIRECTIVES,
  requiredOrigins: {
    connectSrc: ['https://model-cdn.example.com'],
    workerSrc: ['blob:'],
    styleSrc: ["'unsafe-inline'"],
  },
};
