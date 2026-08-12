export interface EntropyTestFixture {
  id: string;
  description: string;
  input: string;
  expectedEntropy: number;
  tolerance?: number;
}

export const ENTROPY_TEST_FIXTURES: EntropyTestFixture[] = [
  {
    id: 'empty-string',
    description: 'Empty string returns 0 bits/char',
    input: '',
    expectedEntropy: 0,
  },
  {
    id: 'single-char',
    description: 'Single character string returns 0 bits/char',
    input: 'a',
    expectedEntropy: 0,
  },
  {
    id: 'repeated-char',
    description: 'Repeated character string returns 0 bits/char',
    input: 'aaaaaaaaaaaaaaaaaaaa',
    expectedEntropy: 0,
  },
  {
    id: 'two-char-equal',
    description: '50/50 split of 2 unique characters returns 1.0 bits/char',
    input: 'abababababababababab',
    expectedEntropy: 1.0,
  },
  {
    id: 'four-char-equal',
    description: 'Equal split of 4 unique characters returns 2.0 bits/char',
    input: 'abcdabcdabcdabcdabcd',
    expectedEntropy: 2.0,
  },
  {
    id: 'ten-char-unique',
    description: '10 unique characters each appearing once returns log2(10) ~ 3.3219 bits/char',
    input: 'abcdefghij',
    expectedEntropy: Math.log2(10), // ~3.321928
    tolerance: 0.0001,
  },
  {
    id: 'sixteen-hex-unique',
    description: '16 unique hex characters each appearing once returns 4.0 bits/char',
    input: '0123456789abcdef',
    expectedEntropy: 4.0,
  },
  {
    id: 'low-entropy-english',
    description: 'Structured English prose string returns ~4.38 bits/char',
    input: 'the quick brown fox jumps over the lazy dog',
    expectedEntropy: 4.385,
    tolerance: 0.05,
  },
  {
    id: 'high-entropy-base64',
    description: 'High entropy random Base64 key returns ~4.66 bits/char',
    input: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    expectedEntropy: 4.663,
    tolerance: 0.05,
  },
  {
    id: 'high-entropy-aws-secret',
    description: 'High entropy AWS secret key returns ~4.48 bits/char',
    input: 'AKIAIOSFODNN7EXAMPLEKEY1234567890ABCDEF',
    expectedEntropy: 4.481,
    tolerance: 0.05,
  },
  {
    id: 'high-entropy-hex-token',
    description: 'Random 64-char hex string returns ~4.407 bits/char',
    input: 'hex_token_v1_1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    expectedEntropy: 4.407,
    tolerance: 0.05,
  },
  {
    id: 'whitespace-only',
    description: 'Whitespace-only string with single char returns 0 bits/char',
    input: '                    ',
    expectedEntropy: 0,
  },
  {
    id: 'mixed-whitespace',
    description: 'Spaces and tabs equal distribution returns 1.0 bits/char',
    input: ' \t \t \t \t \t \t \t \t \t \t',
    expectedEntropy: 1.0,
  },
  {
    id: 'unicode-emojis',
    description: 'Unicode emoji string returns valid entropy',
    input: '🔒🔑🛡️🔐🔒🔑🛡️🔐',
    expectedEntropy: 2.281,
    tolerance: 0.05,
  },
  {
    id: 'threshold-border-below',
    description: 'String with entropy 5.08 bits/char',
    input: '1234567890abcdefghijklmnopqrstuvwxyz1234567890a',
    expectedEntropy: 5.086,
    tolerance: 0.05,
  },
  {
    id: 'threshold-border-above',
    description: 'String with entropy above 4.5 bits/char (~5.32)',
    input: 'aB3$xZ9!mQ7#kL1@pW5&vY2*rN8%tU0^jI4~oP6+',
    expectedEntropy: 5.321,
    tolerance: 0.05,
  },
  {
    id: 'length-border-19',
    description: 'High entropy string with length 19 (under default minLength 20)',
    input: 'aB3$xZ9!mQ7#kL1@pW5',
    expectedEntropy: 4.248,
    tolerance: 0.05,
  },
  {
    id: 'length-border-20',
    description: 'High entropy string with length 20 (exactly default minLength 20)',
    input: 'aB3$xZ9!mQ7#kL1@pW5&',
    expectedEntropy: 4.321,
    tolerance: 0.05,
  },
  {
    id: 'length-border-21',
    description: 'High entropy string with length 21 (above default minLength 20)',
    input: 'aB3$xZ9!mQ7#kL1@pW5&v',
    expectedEntropy: 4.392,
    tolerance: 0.05,
  },
  {
    id: 'full-ascii-printable',
    description: '95 unique ASCII printable characters returns log2(95) ~ 6.569 bits/char',
    input:
      ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
    expectedEntropy: Math.log2(95), // ~6.569856
    tolerance: 0.0001,
  },
];
