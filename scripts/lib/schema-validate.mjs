import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { repoRoot } from './config.mjs';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const compiled = new Map();

function compile(schemaName) {
  if (compiled.has(schemaName)) return compiled.get(schemaName);
  const path = `${repoRoot()}schemas/${schemaName}.schema.json`;
  const schema = JSON.parse(readFileSync(path, 'utf8'));
  const validate = ajv.compile(schema);
  compiled.set(schemaName, validate);
  return validate;
}

/**
 * Validates `data` against schemas/<schemaName>.schema.json.
 * Throws with a readable message on failure; returns data unchanged on success.
 */
export function validateAgainstSchema(schemaName, data) {
  const validate = compile(schemaName);
  const ok = validate(data);
  if (!ok) {
    const details = (validate.errors ?? [])
      .map((e) => `  - ${e.instancePath || '(root)'} ${e.message}`)
      .join('\n');
    throw new Error(`${schemaName} failed schema validation:\n${details}`);
  }
  return data;
}
