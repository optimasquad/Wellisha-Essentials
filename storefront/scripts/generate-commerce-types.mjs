import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const contractUrl = new URL('../../backend/contracts/openapi.json', import.meta.url);
export const outputUrl = new URL('../lib/generated/commerce-types.ts', import.meta.url);

// Deliberately supports the schemas used by this contract, not arbitrary OpenAPI.
// Reject new type constructs until their rendering is implemented and reviewed.
export function generateTypes(contract) {
  const schemas = contract.components.schemas;
  function type(schema) {
    for (const key of ['oneOf', 'anyOf', 'allOf', 'not']) {
      if (key in schema) throw new Error(`Unsupported schema keyword: ${key}`);
    }
    if ('additionalProperties' in schema && schema.additionalProperties !== false) {
      throw new Error('Unsupported additionalProperties schema');
    }
    let result;
    if (schema.$ref) {
      const prefix = '#/components/schemas/';
      if (!schema.$ref.startsWith(prefix) || !schemas[schema.$ref.slice(prefix.length)]) {
        throw new Error(`Unknown schema reference: ${schema.$ref}`);
      }
      result = schema.$ref.slice(prefix.length);
    } else if (schema.enum) {
      result = schema.enum.map(value => JSON.stringify(value)).join(' | ');
    } else switch (schema.type) {
      case 'string': result = 'string'; break;
      case 'integer': case 'number': result = 'number'; break;
      case 'boolean': result = 'boolean'; break;
      case 'array': result = `Array<${type(schema.items)}>`; break;
      case 'object': {
        const required = new Set(schema.required ?? []);
        result = '{\n' + Object.entries(schema.properties ?? {}).map(([name, value]) =>
          `  ${JSON.stringify(name)}${required.has(name) ? '' : '?'}: ${type(value)};`).join('\n') + '\n}';
        break;
      }
      default: throw new Error(`Unsupported schema type: ${schema.type}`);
    }
    return schema.nullable ? `${result} | null` : result;
  }
  return '// Generated from backend/contracts/openapi.json. Run npm run contracts:generate.\n'
    + '// Types describe wire data; validate untrusted JSON at runtime. int64 maps to number: require safe integers.\n\n'
    + Object.entries(schemas).map(([name, schema]) => {
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) throw new Error(`Invalid type name: ${name}`);
      return `export type ${name} = ${type(schema)};\n`;
    }).join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const expected = generateTypes(JSON.parse(readFileSync(contractUrl, 'utf8')));
  if (process.argv.includes('--check')) {
    if (readFileSync(outputUrl, 'utf8') !== expected) throw new Error('Commerce types are stale. Run npm run contracts:generate.');
    console.log('Commerce generated types match the contract.');
  } else {
    writeFileSync(outputUrl, expected);
    console.log('Generated commerce types.');
  }
}
