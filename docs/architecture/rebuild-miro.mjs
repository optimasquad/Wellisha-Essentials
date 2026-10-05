import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const xml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const frames = [];
const palette = {plain:['#B8ACFB','#8A7BE0','#231266'],blue:['#9CE6FF','#2C97BB','#1C4657'],yellow:['#FFE86D','#A28E26','#574900'],neutral:['#DDDDD8','#8A8A7E','#434339']};
function frame(key,title,x,y,note){const f={key,title,x,y,note,w:3200,h:2240,nodes:[],texts:[],zones:[],edges:[],rules:[]};frames.push(f);return f;}
function node(f,id,label,x,y,w=344,h=224,color='plain',shape='rectangle'){const n={id:f.key+'_'+id,label,x,y,w,h,color,shape};f.nodes.push(n);return n;}
function text(f,label,x,y,w,size=33,bold=false){f.texts.push({label,x,y,w,size,bold});}
function zone(f,label,x,y,w,h,fill='#f0f5fd'){f.zones.push({label,x,y,w,h,fill});}
function edge(f,a,b,label='',start='right',end='left',dashed=false){f.edges.push({id:f.key+'_edge'+f.edges.length,a,b,label,start,end,dashed});}
function endpoint(n,side){return side==='right'?[n.x+n.w,n.y+n.h/2]:side==='left'?[n.x,n.y+n.h/2]:side==='top'?[n.x+n.w/2,n.y]:[n.x+n.w/2,n.y+n.h];}

const arch=frame('architecture','01. High-Level AWS Architecture',0,-2560,'Component boundaries, owned data and external integrations. Proposed production deployment in Mumbai.');
zone(arch,'CUSTOMERS AND STAFF',64,256,408,1424);
zone(arch,'EDGE, IDENTITY AND MEDIA',568,256,408,1424);
zone(arch,'COMMERCE AND OWNED DATA',1072,256,912,1424,'#fffbed');
zone(arch,'ASYNC WORK AND PARTNERS',2080,256,912,1424);
const clients=node(arch,'clients','Web storefront\nAndroid and iOS apps',96,440);
node(arch,'staff','Authorized staff\nCatalog and support console',96,920);
node(arch,'art','Merchandising\nProduct artwork and video',96,1400);
const ingress=node(arch,'edge','Route 53 / ACM\nCloudFront / AWS WAF',600,440);
node(arch,'identity','Amazon Cognito\nGoogle / Microsoft / Apple',600,920);
node(arch,'media','S3 / image worker\nMediaConvert / approved media',600,1400);
const web=node(arch,'web','ECS Fargate: Next.js\nWeb rendering / session BFF\nNo database credentials',1104,440);
const api=node(arch,'api','Commerce API on ECS\nCatalog / cart / orders\nPayments / tracking\nSupport / agent actions',1608,440,344,300);
const imports=node(arch,'imports','Import and cache workers\nVersioned catalog publication',1104,920);
const cache=node(arch,'cache','ElastiCache for Valkey\nRead cache, never payment truth',1104,1400,344,160,'plain','can');
const db=node(arch,'db','RDS PostgreSQL Multi-AZ\nOrders / stock / inbox / outbox',1608,1400,344,160,'plain','can');
const events=node(arch,'events','Outbox relay / EventBridge\nDedicated SQS queues + DLQs',2112,1400);
const workers=node(arch,'workers','ECS fulfillment / refund workers\nIdempotency and reconciliation',2112,920);
const payment=node(arch,'payment','Razorpay\nHosted payment and refunds',2616,440);
const provider=node(arch,'provider','Contracted Amazon Shipping\nRates / labels / track / cancel',2616,920);
const messages=node(arch,'messages','SES / AWS SMS\nIndependent email / SMS workers',2616,1400);
edge(arch,clients,ingress,'HTTPS');edge(arch,ingress,web,'ALB');edge(arch,web,api,'API');
edge(arch,api,payment,'Payment API');edge(arch,api,db,'Transaction','bottom','top');
edge(arch,db,events,'Outbox');edge(arch,events,workers,'Jobs','top','bottom',true);
edge(arch,workers,provider,'Provider API');edge(arch,workers,messages,'Updates','right','left',true);
edge(arch,imports,cache,'Refresh','bottom','top',true);
text(arch,'Identity: clients obtain Cognito tokens; the API enforces roles and resource ownership.',600,1792,2520);
text(arch,'Provider callbacks: verified at the API and durably stored before acknowledgement. Scheduler handles expiry and reconciliation.',600,1888,2520);
text(arch,'AWS foundation: private subnets / two AZs / scoped IAM / KMS / Secrets Manager / CloudWatch and tracing / tested restores.',64,2016,3072);
text(arch,'Delivery: GitHub Actions OIDC → ECR → CDK. Flipkart / Meesho remain optional sales channels, subject to partner access.',64,2112,3072);

const booking=frame('booking','A. Booking',0,0,'Customer journey through verified payment. Fixed positions keep every step inside this frame.');
zone(booking,'DISCOVERY AND IDENTITY',64,256,3072,416);
zone(booking,'QUOTE AND STOCK RESERVATION',64,800,3072,416,'#fffbed');
zone(booking,'PAYMENT AND DURABLE CONFIRMATION',64,1344,3072,416);
const cols=[96,712,1328,1944,2560];
const rows=[[
['clients','Web / Android / iOS\nBrowse and sign in'],['auth','Cognito federation\nGoogle / Microsoft / Apple'],['catalog','Catalog API / Valkey\nListings and current prices'],['media','Approved product media\nCloudFront delivery'],['cart','Own cart and address\nResource ownership enforced']
],[
['quote','Server checkout quote\nTax / shipping / discount'],['accept','Customer accepts quote\nRepricing requires consent'],['reserve','PostgreSQL transaction\nReserve stock / pending order'],['mapping','Mapped Razorpay order\nStable idempotency key'],['checkout','Hosted Razorpay checkout\nCustomer completes payment']
],[
['webhook','Signed captured webhook\nDurable unique inbox'],['validate','Validate payment binding\nOwner / amount / currency'],['paid','Atomic paid transaction\nOrderPaid outbox event'],['bus','Outbox relay / EventBridge\nFulfillment SQS queue'],['handoff','Post-Booking handoff\nDispatch only after confirmation']
]];
const bnodes=rows.map((r,ri)=>r.map(([id,label],i)=>node(booking,id,(ri*5+i+1)+'. '+label,cols[i],384+ri*544,488,160)));
for(const r of bnodes)for(let i=0;i<4;i++)edge(booking,r[i],r[i+1]);
text(booking,'Read 1–5 left to right, then 6–10, then 11–15. Each row is a separate stage of the same booking lifecycle.',64,1856,3072);
text(booking,'Integrity: invalid or ambiguous payment remains pending for reconciliation; browser success never authorizes dispatch.',64,1952,3072);
text(booking,'Expiry: late captured payment requires a fresh stock check or compensating refund. Review stock owner and serviceability.',64,2048,3072);

const post=frame('post','B. Post-Booking Operations',3520,0,'Fulfillment, delivery tracking and controlled support actions. Cancellation is agent-only.');
zone(post,'FULFILLMENT AND TRACKING',64,256,3072,416);
zone(post,'SUPPORT AND CANCELLATION',64,800,3072,416,'#fffbed');
zone(post,'ELIGIBILITY, REFUNDS AND COMMUNICATIONS',64,1344,3072,416);
const prows=[[
['paid','OrderPaid / outbox\nEventBridge / SQS'],['worker','Fulfillment worker\nStable merchant request ID'],['provider','Wellisha pack / Amazon Shipping\nPickup / deliver'],['tracking','Tracking inbox and polling\nNormalized shipment state'],['view','Customer tracking\nETA / split shipments / support']
],[
['case','Customer contacts support\nCase only; no order mutation'],['agent','Authorized support agent\nMFA / role / case / reason'],['intent','Audited cancellation intent\nSerialize with dispatch'],['cancel','Provider cancellation\nAccepted / rejected / pending'],['reconcile','Ambiguous outcome\nReconcile before retry']
],[
['eligibility','Confirm refund eligibility\nCancelled or verified return/RTO'],['refund','Refund worker / Razorpay\nDeduplicated refund intent'],['outcome','Signed refund outcome\nValidate / persist / reconcile'],['status','Customer refund status\nSeparate from shipment status'],['notify','Email and SMS queues\nDelivery outcomes / retries']
]];
const pnodes=prows.map((r,ri)=>r.map(([id,label],i)=>node(post,id,(ri*5+i+1)+'. '+label,cols[i],384+ri*544,488,160)));
for(const r of pnodes)for(let i=0;i<4;i++)edge(post,r[i],r[i+1]);
text(post,'Conditional flow: cancellation acceptance proceeds to eligibility. Pending outcomes reconcile; rejected requests follow the return policy.',64,1856,3072);
text(post,'Customer calls to cancellation/refund execution APIs are forbidden. Opening a support case never automatically cancels.',64,1952,3072);
text(post,'Refunds are bounded by captured money and existing refund intents. Notification failures never undo the order.',64,2048,3072);

const generator=fs.readFileSync(path.join(dir,'generate-diagrams.mjs'),'utf8').split('function textSVG')[0].replace(/^import .*;\r?\n/gm,'').replace(/^const directory = .*;\r?\n/m,'');
const models=new Function(generator+';return pages;')();
const positions={'02-login':[0,2560],'05-cancellation':[3520,2560],'03-catalog':[0,6720],'07-tracking':[3520,6720],'04-checkout':[0,10880],'06-notifications':[3520,10880],'10-media':[0,15040]};
for(const p of models.filter(p=>p.sequence)){
 const [x,y]=positions[p.id];const f=frame(p.id,p.title.replace(/  /g,'. '),x,y,p.subtitle.replace(/\|/g,' / '));f.h=3840;
 const {names,steps,notes}=p.sequence;const xs=names.map((_,i)=>288+i*512);
 names.forEach((name,i)=>{node(f,'actor'+i,name.replace(/\n/g,' '),64+i*512,288,448,160,'blue');f.rules.push({x1:xs[i],y1:448,x2:xs[i],y2:3456,dashed:true});});
 steps.forEach(([from,to,label,dashed],i)=>{const yy=640+i*192;
  if(from===to){node(f,'self'+i,(i+1)+'. '+label,64+from*512,yy-152,448,160,'yellow');return;}
  const a=node(f,'anchor'+i+'a','',xs[from]-4,yy-4,8,8,'plain');const b=node(f,'anchor'+i+'b','',xs[to]-4,yy-4,8,8,'plain');a.anchor=b.anchor=true;
  edge(f,a,b,'',from<to?'right':'left',from<to?'left':'right',dashed);
  text(f,(i+1)+'. '+label,Math.min(xs[from],xs[to])+20,yy-152,Math.abs(xs[to]-xs[from])-40,33);
 });
 text(f,notes.replace(/\n/g,' '),64,3520,3072,33);
}

// Keep all labels readable at review zoom and reserve space for their wrapping.
for (const f of frames) {
 for (const n of f.nodes) {
  if (n.anchor) { n.color='neutral'; continue; }
  if (f.key==='booking'||f.key==='post') { n.h=224; n.color=n.y<800?'blue':n.y<1344?'yellow':'plain'; }
  if (f.key==='architecture') { n.h=Math.max(n.h,272); n.color=n.x<1072?'blue':n.x<2080?'yellow':'plain'; }
 }
 if(f.key==='architecture') {
  const labels={'clients':'Web storefront\nAndroid / iOS apps','staff':'Staff console\nCatalog / support','art':'Merchandising\nArtwork / video','identity':'Amazon Cognito\nFederated sign-in','media':'S3 / media worker\nMediaConvert','web':'Next.js on ECS\nSession BFF\nNo DB access','api':'Commerce API\nCatalog / orders\nPayment / tracking\nSupport actions','imports':'Catalog workers\nVersioned imports','cache':'Valkey cache\nRead models only','db':'PostgreSQL\nMulti-AZ RDS\nStock / inbox / outbox','events':'Outbox relay\nEventBridge / SQS\nDedicated DLQs','workers':'ECS workers\nFulfill / refund\nReconcile / retry','payment':'Razorpay\nPayment / refund','provider':'Amazon Shipping\nContracted provider','messages':'SES / AWS SMS\nIndependent workers'};
  Object.assign(labels,{api:'Kotlin API\nSpring Boot\nCatalog / orders\nPay / track / support',imports:'Kotlin workers\nCatalog imports\nVersioned releases',db:'PostgreSQL\nMulti-AZ RDS\nTyped + JSONB\nStock / outbox',workers:'Kotlin workers\nSpring Boot\nFulfill / refund\nReconcile / retry'});
  for(const n of f.nodes){const id=n.id.replace('architecture_','');if(labels[id])n.label=labels[id];}
  // Connector labels are separate horizontal text, avoiding rotated labels.
  for(const e of f.edges){if(!e.label)continue;const a=endpoint(e.a,e.start),b=endpoint(e.b,e.end);const horizontal=Math.abs(a[1]-b[1])<40;text(f,e.label,horizontal?(a[0]+b[0])/2-76:a[0]+24,horizontal?a[1]-72:(a[1]+b[1])/2-24,horizontal?152:280,28);e.label='';} const jobLabel=f.texts.find(t=>t.label==='Jobs'); if(jobLabel)jobLabel.w=140;
 }
}
const stack=frame('13-stack','13. Kotlin Backend and PostgreSQL Flexibility',3520,-2560,'Confirmed: Kotlin + Spring Boot and PostgreSQL. Design decisions guide implementation; APIs are not implemented yet.');
const stackCards=[["Backend stack","Kotlin + Spring Boot APIs and workers. JVM 21 / Corretto proposed. Spring Security validates Cognito tokens; OpenAPI generates web/mobile clients.","#9CE6FF","#1C4657"],["Flexible PostgreSQL data","Typed tables for orders, money, stock and ownership. Validated, versioned JSONB for optional product attributes and partner metadata. Index actual queries.","#FFE86D","#574900"],["Safe schema evolution","Flyway versioned migrations in one deployment job. Add fields first; backfill; switch readers/writers; remove old fields later. Rehearse migrations and restores.","#B8ACFB","#231266"],["Flexible queries","Repository boundaries and parameterized SQL. Allowlisted filters/sorts, cursor pagination and query-plan checks. Add targeted reporting queries without exposing database models.","#FFE86D","#574900"],["Module boundaries","Catalog, commerce, payment and fulfillment own their tables and writes. One PostgreSQL database initially; explicit service operations keep future extraction possible.","#B8ACFB","#231266"],["Security and integrity","Check customer ownership on every request. Staff MFA and restricted permissions. Least-privilege DB roles, audited refunds, exact money, unique keys and atomic stock/payment transitions.","#9CE6FF","#1C4657"]];
stackCards.forEach((c,i)=>{const x=64+(i%3)*1040,y=320+Math.floor(i/3)*816;zone(stack,c[0],x,y,992,736,c[2]);text(stack,c[1],x+32,y+144,928,33);});
text(stack,'S3 stores media, PDFs and large payloads; PostgreSQL stores searchable metadata and object references. JSONB supplements typed tables.',64,2016,3072,33);
arch.note='Chosen backend: Kotlin + Spring Boot; PostgreSQL on RDS. JVM 21 and Mumbai deployment proposed.';
function wrap(s,w,size){const out=[];for(const p of s.split('\n')){let line='';for(const word of p.split(' ')){if(line&&(line.length+word.length+1)*size*.55>w){out.push(line);line=word;}else line+=(line?' ':'')+word;}out.push(line);}return out;}
function svgText(t){const lines=wrap(t.label,t.w,t.size);return `<text font-family="Arial" font-size="${t.size}" fill="#1a1a1a"${t.bold?' font-weight="bold"':''}>${lines.map((l,i)=>`<tspan x="${t.x}" y="${t.y+t.size+i*t.size*1.4}">${xml(l)}</tspan>`).join('')}</text>`;}
function normal(f){return `<svg xmlns="http://www.w3.org/2000/svg" width="${f.w}" height="${f.h}" viewBox="0 0 ${f.w} ${f.h}"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10" fill="#313131"/></marker></defs><rect width="100%" height="100%" fill="white"/>${svgText({label:f.title,x:64,y:64,w:3072,size:67,bold:true})}${svgText({label:f.note,x:64,y:184,w:3072,size:33})}${f.zones.map(z=>`<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${z.fill}" stroke="#b0b0b0"/>${svgText({label:z.label,x:z.x+32,y:z.y+32,w:z.w-64,size:33,bold:true})}`).join('')}${f.rules.map(r=>`<line x1="${r.x1}" y1="${r.y1}" x2="${r.x2}" y2="${r.y2}" stroke="#b0b0b0" stroke-dasharray="5 5"/>`).join('')}${f.edges.map(e=>{const a=endpoint(e.a,e.start),b=endpoint(e.b,e.end);let points=[a,b];if(a[0]!==b[0]&&a[1]!==b[1]){const mid=(a[0]+b[0])/2;points=[a,[mid,a[1]],[mid,b[1]],b];}return `<polyline points="${points.map(x=>x.join(',')).join(' ')}" fill="none" stroke="#313131" stroke-width="2" marker-end="url(#arrow)"${e.dashed?' stroke-dasharray="5 5"':''}/>${e.label?svgText({label:e.label,x:(a[0]+b[0])/2-60,y:(a[1]+b[1])/2-40,w:160,size:18}):''}`;}).join('')}${f.nodes.filter(n=>!n.anchor).map(n=>{const [fill,stroke]=palette[n.color];const lines=wrap(n.label,n.w-48,33),height=lines.length*47;return `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.shape==='can'?24:0}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${svgText({label:n.label,x:n.x+24,y:n.y+(n.h-height)/2,w:n.w-48,size:33})}`;}).join('')}${f.texts.map(svgText).join('')}</svg>`;}
function native(f){return `<g id="${f.key}_fixed" data-frame="${xml(f.title)}" transform="translate(${f.x},${f.y})"><rect data-type="frame" x="0" y="0" width="${f.w}" height="${f.h}" fill="#ffffff"/><textArea id="${f.key}_title" x="64" y="64" width="3072" font-family="noto_sans" font-size="67" font-weight="bold" fill="#1a1a1a">${xml(f.title)}</textArea><textArea id="${f.key}_note" x="64" y="184" width="3072" font-family="noto_sans" font-size="33" fill="#595959">${xml(f.note)}</textArea>${f.zones.map(z=>`<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${z.fill}" stroke="#b0b0b0" stroke-width="2"/><textArea x="${z.x+32}" y="${z.y+32}" width="${z.w-64}" font-family="noto_sans" font-size="33" font-weight="bold" fill="#1a1a1a">${xml(z.label)}</textArea>`).join('')}${f.rules.map(r=>`<line data-type="divider" x1="${r.x1}" y1="${r.y1}" x2="${r.x2}" y2="${r.y2}" stroke="#b0b0b0" stroke-width="2" data-line-style="dashed"/>`).join('')}${f.nodes.map(n=>{const [fill,stroke,ink]=palette[n.color];return `<rect id="${n.id}" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" data-shape="${n.shape}" fill="${fill}" stroke="${n.anchor?'none':stroke}" stroke-width="2" data-content="${xml(n.label.replace(/\n/g,'<br>'))}" data-text-color="${ink}" data-font-family="noto_sans" data-font-size="33"/>`;}).join('')}${f.edges.map(e=>{const a=endpoint(e.a,e.start),b=endpoint(e.b,e.end);return `<line id="${e.id}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" data-start="${e.a.id}" data-end="${e.b.id}" data-start-side="${e.start}" data-end-side="${e.end}" data-shape="${a[0]===b[0]||a[1]===b[1]?'straight':'elbowed'}" data-arrow="end" stroke="#313131" stroke-width="2"${e.dashed?' stroke-dasharray="5,5"':''}${e.label?` data-content="${xml(e.label)}"`:''}/>`;}).join('')}${f.texts.map((t,i)=>`<textArea id="${f.key}_text${i}" x="${t.x}" y="${t.y}" width="${t.w}" font-family="noto_sans" font-size="${t.size}" fill="#595959">${xml(t.label)}</textArea>`).join('')}</g>`;}
fs.mkdirSync(path.join(dir,'miro-repair'),{recursive:true});
for(const f of frames){fs.writeFileSync(path.join(dir,'miro-repair',f.key+'.svg'),normal(f));fs.writeFileSync(path.join(dir,'miro-repair',f.key+'.canvas.xml'),`<svg xmlns="http://www.w3.org/2000/svg">${native(f)}</svg>`);}
fs.writeFileSync(path.join(dir,'miro-repair','models.json'),JSON.stringify(frames,null,2));
console.log(JSON.stringify(frames.map(f=>({key:f.key,nodes:f.nodes.length,edges:f.edges.length,x:f.x,y:f.y}))));
