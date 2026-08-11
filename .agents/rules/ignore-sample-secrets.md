# Ignore Sample Secrets and Validation Fixtures Rule

## Guideline
Whenever a sample file containing mock secrets, test credentials, webhook URLs, API keys, tokens, or scanner validation data is created or updated:
1. Automatically add its path or pattern to `.gitignore` (e.g. `src/test/fixtures/secrets/`, `*.sample.json`, `*.secrets.json`, `*.mock.json`).
2. Untrack it from the Git index (`git rm --cached <filepath>`) if previously tracked.
3. Preserve the file locally for test runner execution and local development.
4. Ensure mock secret files are never tracked by Git or pushed to remote repositories.
