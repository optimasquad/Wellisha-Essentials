import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {contractUrl} from './generate-commerce-types.mjs';
export const clientUrl=new URL('../lib/generated/commerce-client.ts',import.meta.url);
export function generateClient(doc){
 const refs=new Set();const names=new Set();
 const type=s=>{if(s?.$ref){const name=s.$ref.split('/').at(-1);if(!doc.components.schemas[name])throw Error('Unknown schema');refs.add(name);return name;}if(s?.type==='array')return `Array<${type(s.items)}>`;return 'unknown';};
 const functions=[];
 for(const [path,methods]of Object.entries(doc.paths))for(const [method,operation]of Object.entries(methods)){
  if(path.includes('/webhooks/'))continue; // Signed provider ingress is never a browser SDK operation.
  const name=operation.operationId;if(!/^[A-Za-z][A-Za-z0-9]*$/.test(name)||names.has(name))throw Error('Invalid/duplicate operationId');names.add(name);
  const args=[];const parameters=operation.parameters??[];
  for(const p of parameters.filter(p=>p.in==='path'))args.push(`${p.name}: string`);
  const input=operation.requestBody?.content?.['application/json']?.schema;if(input)args.push(`body: ${type(input)}`);
  if(parameters.some(p=>p.in==='header'&&p.name==='Idempotency-Key'))args.push('idempotencyKey: string');
  args.push('options: CommerceClientOptions = {}');
  const query=parameters.filter(p=>p.in==='query').map(p=>JSON.stringify(p.name));
  const output=Object.entries(operation.responses).find(([code])=>/^2\d\d$/.test(code))?.[1]?.content?.['application/json']?.schema;
  const result=output?type(output):'void';
  const routed=path==='/v1/products'?'/api/catalog':path==='/v1/categories'?'/api/catalog/categories':path==='/v1/products/{slug}'?'/api/catalog/{slug}':path.replace(/^\/v1/,'/api/commerce');
  const template=routed.replace(/\{(\w+)\}/g,(_,p)=>'${encodeURIComponent('+p+')}');
  functions.push(`export function ${name}(${args.join(', ')}): Promise<${result}> {\n  return send<${result}>(\`${template}\`, ${JSON.stringify(method.toUpperCase())}, ${input?'body':'undefined'}, ${parameters.some(p=>p.in==='header'&&p.name==='Idempotency-Key')?'idempotencyKey':'undefined'}, options, [${query.join(',')}]);\n}\n`);
 }
 return '// Generated from backend/contracts/openapi.json. Run npm run contracts:generate.\n'
  +`import type { ${[...refs].sort().join(', ')} } from './commerce-types';\n\n`
  +`export type CommerceClientOptions = { signal?: AbortSignal; query?: Record<string,string|number|undefined>; fetch?: typeof fetch };\n`
  +`export class CommerceApiError extends Error { constructor(public readonly status: number) { super('Commerce request failed'); } }\n`
  +`async function send<T>(path: string, method: string, body: unknown, key: string|undefined, options: CommerceClientOptions, allowedQuery: string[]): Promise<T> {\n`
  +`  const query = new URLSearchParams(); for (const name of allowedQuery) { const value=options.query?.[name]; if(value!==undefined)query.set(name,String(value)); }\n`
  +`  const response=await (options.fetch??fetch)(path+(query.size?'?'+query.toString():''), { method, cache:'no-store', signal:options.signal, headers:{'Content-Type':'application/json', ...(key?{'Idempotency-Key':key}:{})}, ...(body===undefined?{}:{body:JSON.stringify(body)}) });\n`
  +`  if(!response.ok)throw new CommerceApiError(response.status); return (response.status===204?undefined:await response.json()) as T;\n}\n\n`
  +functions.join('\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const expected=generateClient(JSON.parse(readFileSync(contractUrl,'utf8')));
 if(process.argv.includes('--check')){if(readFileSync(clientUrl,'utf8')!==expected)throw Error('Commerce client is stale');console.log('Commerce client matches contract.');}
 else{writeFileSync(clientUrl,expected);console.log('Generated commerce transport client.');}
}
