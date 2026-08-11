export const jsCodeSample = `import dotenv from 'dotenv';
dotenv.config();

const API_KEY = "mock_api_key_sample_value_1234567890";
const secret_token = 'mock_secret_token_sample_value_987654';

export function connect() {
  const dbPassword = "db_password_sample_value_abcdef";
  const endpoint = \`https://api.example.com/v1/auth?token=\${secret_token}\`;
  return { API_KEY, dbPassword, endpoint };
}
`;

export const pythonCodeSample = `import os

AWS_SECRET_ACCESS_KEY = "mock_aws_secret_key_sample_val_123"
DATABASE_URL = "postgresql://user:mock_pass_sample@localhost:5432/mydb"

def get_credentials():
    api_token = "mock_api_token_sample_val_456789"
    return {"aws_key": AWS_SECRET_ACCESS_KEY, "token": api_token}
`;

export const yamlCodeSample = `version: '3'
services:
  web:
    image: nginx:latest
    environment:
      SECRET_KEY: "mock_yaml_secret_key_val_12345"
      API_CREDENTIAL: 'mock_yaml_credential_val_67890'
      LONG_TOKEN: "mock_long_token_string_exceeding_twenty_chars_easily"
`;

export const jsonCodeSample = `{
  "appName": "AirGapScanner",
  "apiKey": "mock_json_api_key_val_123456789",
  "authSecret": "mock_json_auth_secret_val_987654321",
  "maxConnections": 100
}
`;

export const envCodeSample = `# Production Environment Variables
AWS_ACCESS_KEY_ID=mock_env_aws_key_val_123
AWS_SECRET_ACCESS_KEY=mock_env_aws_secret_val_456
SLACK_WEBHOOK_TOKEN=mock_env_slack_token_val_789
SESSION_SECRET=mock_env_session_secret_val_012
`;

export const terraformHclCodeSample = `provider "aws" {
  region = "us-west-2"
}

resource "aws_db_instance" "default" {
  allocated_storage = 20
  engine            = "mysql"
  username          = "admin"
  password          = "mock_hcl_db_password_val_123"
  secret_token      = "mock_hcl_secret_token_val_456"
}
`;
