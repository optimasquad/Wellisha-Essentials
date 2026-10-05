import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// One geometry model produces editable draw.io cells and matching SVG previews.
const directory = path.dirname(fileURLToPath(import.meta.url));
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])).replace(/\n/g, '&#10;');
const palette = { client: '#E8F0FE', compute: '#E6F4EA', data: '#FFF2CC', async: '#E6F3F7', external: '#FCE8E6', neutral: '#F2F4F7' };
const pages = [];

function wrap(text, width, size = 15) {
  return text.split('\n').flatMap((paragraph) => {
    const lines = []; let line = '';
    for (const word of paragraph.split(' ')) {
      if (line && (line.length + word.length + 1) * size * 0.54 > width) { lines.push(line); line = word; }
      else line += `${line ? ' ' : ''}${word}`;
    }
    lines.push(line); return lines;
  });
}

function page(id, title, subtitle, width = 1800, height = 1220) {
  const p = { id, title, subtitle, width, height, boxes: [], edges: [], texts: [] };
  pages.push(p);
  p.texts.push({ id: 'title', text: title, x: 40, y: 25, w: width - 80, h: 42, size: 28, bold: true });
  p.texts.push({ id: 'subtitle', text: subtitle, x: 40, y: 75, w: width - 80, h: 45, size: 16 });
  return p;
}
function box(p, id, text, x, y, w = 260, h = 90, kind = 'neutral') {
  p.boxes.push({ id, text, x, y, w, h, color: palette[kind] }); return id;
}
function line(p, id, x1, y1, x2, y2, dashed = false, arrow = true, points = []) {
  p.edges.push({ id, x1, y1, x2, y2, dashed, arrow, points });
}
function label(p, id, text, x, y, w, h = 38, size = 14) { p.texts.push({ id, text, x, y, w, h, size }); }

const a = page('01-architecture', '01  AWS Architecture', 'Wellisha owns checkout | Web + Android + iOS | Proposed production deployment in Mumbai', 1800, 1410);
box(a, 'webclient', 'Web customer\nDesktop + mobile browser', 70, 140, 300, 80, 'client');
box(a, 'mobile', 'Android + iOS apps\nReact Native / Expo', 420, 140, 300, 80, 'client');
box(a, 'admin', 'Admin + agent console\nCatalog, support, cancellations', 770, 140, 300, 80, 'client');
box(a, 'idp', 'Google / Microsoft / Apple\nRegistered identity providers', 1330, 140, 380, 80, 'external');
box(a, 'edge', 'Route 53 + ACM\nCloudFront + AWS WAF', 350, 270, 590, 90, 'client');
box(a, 'cognito', 'Amazon Cognito\nFederation + access tokens', 1330, 270, 380, 90, 'client');
line(a, 'c1', 220, 220, 460, 270, false, true, [[220, 245], [460, 245]]);
line(a, 'c2', 570, 220, 570, 270);
line(a, 'c3', 920, 220, 830, 270, false, true, [[920, 245], [830, 245]]);
line(a, 'id1', 1520, 220, 1520, 270, true);
line(a, 'id2', 1070, 180, 1330, 315, true, true, [[1190, 180], [1190, 315]]);
label(a, 'idnote', 'All clients\nCognito + PKCE', 1000, 225, 175, 55);
box(a, 'alb', 'Application Load Balancer\nSeparate web and API target groups', 350, 420, 590, 80, 'neutral');
line(a, 'edgealb', 645, 360, 645, 420);
label(a, 'cachepolicy', 'API + personalized pages: no CDN cache', 720, 370, 380, 40);
box(a, 'web', 'ECS Fargate: Next.js web\nSSR + session BFF\nNo database credentials', 100, 560, 360, 110, 'compute');
box(a, 'api', 'ECS Fargate: Commerce API\nCatalog | Cart | Orders | Tracking\nPayments | Support | Agent actions', 570, 560, 480, 110, 'compute');
box(a, 'workers', 'ECS Fargate: Workers\nImport | Cache | Payment | Fulfillment\nRefund | Notifications | Outbox relay', 1220, 560, 480, 110, 'compute');
line(a, 'albweb', 440, 500, 280, 560, false, true, [[440, 530], [280, 530]]);
line(a, 'albapi', 810, 500, 810, 560);
line(a, 'webapi', 460, 615, 570, 615);
label(a, 'jwt', 'API validates Cognito tokens, roles and ownership', 1050, 425, 660, 50);
box(a, 'db', 'RDS PostgreSQL Multi-AZ\nSource of truth\nReservations + inbox + outbox', 100, 780, 420, 105, 'data');
box(a, 'redis', 'ElastiCache for Valkey\nVersioned catalog read cache\nCheckout revalidates in DB', 600, 780, 450, 105, 'data');
box(a, 'queues', 'EventBridge -> dedicated SQS queues\nEach queue has a DLQ\nIdempotent workers + reconciliation', 1220, 780, 480, 105, 'async');
line(a, 'apidb', 680, 670, 310, 780, false, true, [[680, 730], [310, 730]]);
line(a, 'apicache', 825, 670, 825, 780);
line(a, 'workercache', 1220, 630, 960, 780, true, true, [[1110,630],[1110,740],[960,740]]);
label(a, 'refreshlabel', 'Cache refresh', 1035, 748, 180, 25, 13);
line(a, 'workerqueue', 1460, 780, 1460, 670, true);
line(a, 'workerdb', 1240, 670, 400, 780, false, true, [[1240, 710], [400, 710]]);
label(a, 'workerdbnote', 'Workers read/write owned records; relay publishes committed outbox events', 100, 892, 950, 30, 13);
line(a, 'relay', 1700, 615, 1700, 830, true, true, [[1740, 615], [1740, 830]]);
box(a, 's3', 'S3\nImages, imports, invoices\nRestricted buckets / prefixes', 100, 970, 330, 95, 'data');
box(a, 'schedule', 'EventBridge Scheduler\nImports, expiry, reconciliation\nS3 events also enqueue imports', 470, 970, 360, 95, 'async');
box(a, 'payment', 'Razorpay\nHosted checkout\nSigned payment/refund webhooks', 880, 970, 370, 95, 'external');
box(a, 'fulfill', 'Fulfillment adapter\nAmazon Shipping (store pickup)\nCreate, track, cancel, return', 1300, 970, 400, 95, 'external');
line(a, 'scheduleq', 650, 970, 1220, 860, true, true, [[650, 925], [1150, 925], [1150, 860]]);
label(a, 'externalnote', 'Provider calls originate from API/workers; signed callbacks enter via edge -> API inbox.', 510, 1080, 1190, 32);
box(a, 'notify', 'SES email + AWS End User Messaging SMS\nIndependent queues; delivery receipts; registered templates', 100, 1160, 740, 80, 'async');
box(a, 'channels', 'Optional marketplace sales channels\nFlipkart / Meesho require verified partner access\nNot assumed to deliver Wellisha-origin orders', 930, 1160, 770, 80, 'external');
line(a, 'integrationsbus', 1700, 650, 265, 1135, false, false, [[1770,650],[1770,1135]]);
line(a, 'tos3', 265, 1135, 265, 1065);
line(a, 'topayment', 1065, 1135, 1065, 1065);
line(a, 'tofulfillment', 1500, 1135, 1500, 1065);
line(a, 'tonotifications', 470, 1135, 470, 1160);
line(a, 'tochannels', 1315, 1135, 1315, 1160, true);
line(a, 's3origin', 350, 315, 100, 1015, false, true, [[35,315],[35,1015]]);
label(a, 'boundary', 'Private subnets: ECS, database and cache | Two AZs | Scoped IAM + KMS + Secrets Manager | Controlled outbound access', 70, 1265, 1650, 42, 16);
label(a, 'ops', 'CloudWatch + OpenTelemetry + CloudTrail | GitHub Actions OIDC -> ECR -> CDK deployment | Solid: request/data; dashed: events/auth', 70, 1320, 1650, 42, 15);

function sequence(id, title, subtitle, names, steps, notes) {
  const width = 1800; const lane = (width - 120) / names.length;
  const height = 280 + steps.length * 76 + 110;
  const p = page(id, title, subtitle, width, height);
  p.sequence = { names, steps, notes };
  const xs = names.map((name, i) => {
    const x = 60 + lane * i;
    box(p, `actor${i}`, name, x + 12, 140, lane - 24, 72, i === 0 ? 'client' : i === names.length - 1 ? 'external' : 'compute');
    line(p, `life${i}`, x + lane / 2, 212, x + lane / 2, height - 125, true, false);
    return x + lane / 2;
  });
  steps.forEach(([from, to, text, dashed = false], i) => {
    const y = 270 + i * 76;
    if (from === to) {
      line(p, `step${i}`, xs[from], y, xs[to], y + 26, dashed, true, [[xs[from] + 65, y], [xs[from] + 65, y + 26]]);
      label(p, `steptext${i}`, `${i + 1}. ${text}`, xs[from] - lane / 2 + 14, y - 44, lane - 28, 40, 13);
    } else {
      line(p, `step${i}`, xs[from], y, xs[to], y, dashed);
      const w = Math.abs(xs[to] - xs[from]) - 22;
      label(p, `steptext${i}`, `${i + 1}. ${text}`, Math.min(xs[from], xs[to]) + 11, y - 49, w, 44, 13);
    }
  });
  box(p, 'notes', notes, 60, height - 105, width - 120, 72, 'neutral');
  return p;
}

sequence('02-login', '02  Federated Login', 'Common identity for web, Android and iOS | Public mobile client uses PKCE; web uses a session BFF',
  ['Customer', 'Web BFF /\nNative app', 'Cognito', 'Google / Microsoft /\nApple', 'Commerce API', 'PostgreSQL'], [
    [0,1,'Choose provider'], [1,2,'Authorize: state, nonce, PKCE'], [2,3,'Federated sign-in'],
    [3,2,'Validated provider response',true], [2,1,'Authorization code',true],
    [1,2,'Exchange code + verifier'], [2,1,'Access token + refresh token',true],
    [1,4,'Call API with access token'], [4,4,'Validate JWT, scopes, role'],
    [4,5,'Resolve issuer/subject identity; check resource owner'], [5,4,'Customer and authorization context',true],
    [4,1,'Authorized response',true]
  ], 'Web: Secure HttpOnly session; tokens stay server-side. Native: system browser and secure token storage.\nTest personal Outlook and organization tenants; link identities only after verified proof of ownership.');

sequence('03-catalog', '03  Catalog and Price Publication', 'Database commit precedes cache publication | Outbox + at-least-once processing | Versioned releases',
  ['Admin / Scheduler\nS3 source', 'Import queue\n+ worker', 'PostgreSQL', 'Outbox relay\nEventBridge', 'Cache queue\n+ worker', 'Valkey / API'], [
    [0,1,'Submit source version + job ID',true], [1,1,'Deduplicate, validate, stage'],
    [1,2,'Activate release + outbox in one transaction'], [2,1,'Committed version; cache pending',true],
    [3,2,'Claim committed outbox entries'], [2,3,'CatalogPublished(version)',true],
    [3,4,'Publish; acknowledge only successful entries',true], [4,2,'Load authoritative release'],
    [2,4,'Products, prices and visibility',true], [4,5,'Build immutable views; CAS newer pointer'],
    [4,2,'Record cache publication status'], [5,5,'Read cache; bounded DB fallback']
  ], 'Duplicates and older events are harmless. Failed jobs retry, then DLQ. Reconcile DB/cache versions.\nCheckout always revalidates live prices and stock; price changes require customer acceptance.');

sequence('04-checkout', '04  Checkout, Payment and Fulfillment', 'Customers pay on Wellisha | Captured payment evidence drives order confirmation | External outcomes may be pending',
  ['Web / Android / iOS', 'Commerce API', 'PostgreSQL', 'Razorpay', 'Inbox / outbox\n+ workers', 'Fulfillment provider'], [
    [0,1,'Create order: quote + idempotency key'], [1,2,'Reprice; reserve stock; persist pending order'],
    [1,3,'Create payment order outside DB transaction'], [3,1,'Provider order ID or unknown outcome',true],
    [1,2,'Persist payment mapping; unknown -> reconcile'], [1,0,'Checkout details or 202 pending',true],
    [0,3,'Customer completes payment'], [3,1,'Signed captured-payment webhook',true],
    [1,2,'Verify signature; persist unique inbox'], [1,3,'Acknowledge durable receipt',true],
    [4,2,'Validate payment binding; paid + outbox transaction'], [4,5,'Book shipment after packed-ready',true],
    [5,4,'Accepted / status / ambiguous result',true], [4,2,'Persist tracking; reconcile; notification outbox'],
    [0,1,'Read order, payment and shipment status']
  ], 'Do not dispatch on browser success alone. Duplicate/out-of-order events cannot repeat effects.\nLate payment after stock expiry: recheck stock or compensate. Provider timeout: reconcile before retry.');

sequence('05-cancellation', '05  Agent Cancellation and Refund', 'Customers contact support; only authorized agents can cancel | Backend RBAC enforces the restriction',
  ['Customer app', 'Support agent\nStaff console', 'Commerce API', 'DB inbox/outbox\n+ queue workers', 'Fulfillment provider', 'Razorpay'], [
    [0,2,'Create support case; no order mutation'], [1,2,'Read assigned case; verify customer/order'],
    [1,2,'Agent cancellation: case + reason + key'], [2,3,'Check agent permission; lock; record intent'],
    [2,1,'202 pending cancellation',true], [3,4,'Cancel / reconcile in-flight submission',true],
    [4,3,'Accepted, rejected or pending',true], [3,3,'Confirmed cancel -> refund intent'],
    [3,5,'Submit deduplicated refund',true], [5,2,'Signed refund outcome callback',true],
    [2,3,'Durable inbox; validate; notify customer'], [0,2,'Read tracking and agent-action status']
  ], 'Customer call to cancellation API -> 403. A support case never automatically cancels an order.\nManual provider-portal actions require an agent audit record and verified reconciliation before completion.');

sequence('06-notifications', '06  Asynchronous Email and SMS', 'Notifications never block checkout or fulfillment | Separate channel queues and delivery tracking',
  ['Commerce transaction', 'DB outbox', 'Relay + EventBridge', 'Email / SMS queues\n+ DLQs', 'Channel workers', 'SES / AWS SMS'], [
    [0,1,'Commit business state + notification event'], [2,1,'Claim committed event'],
    [1,2,'Order / shipment / refund event',true], [2,3,'Fan out to independent channels',true],
    [3,4,'Deliver at least once',true], [4,1,'Resolve consent/template; record unique send intent'],
    [4,5,'Send email or registered SMS'], [5,4,'Provider acceptance / message ID',true],
    [4,1,'Store sent / unknown / failed attempt'], [5,3,'Delivery feedback through event adapter',true],
    [3,4,'Process receipt / retry / DLQ',true], [4,1,'Update delivery outcome; suppress invalid recipients']
  ], 'Send acceptance is not delivery. Persistent dedupe limits repeats; ambiguous sends need a defined retry policy.\nSES production access; India SMS entity/template registration; marketing consent is separate.');

sequence('07-tracking', '07  Customer Delivery Tracking', 'One tracking experience across web, Android and iOS | Shipment-level timeline, ETA and last update',
  ['Carrier / fulfillment', 'Webhook API\n+ durable inbox', 'Tracking worker', 'PostgreSQL', 'Commerce API', 'Customer app'], [
    [0,1,'Signed shipment event',true], [1,3,'Verify signature; store unique event'],
    [1,0,'Acknowledge durable receipt',true], [2,3,'Claim inbox event; deduplicate'],
    [2,3,'Normalize status; persist timeline + outbox'], [2,0,'Scheduled polling for missing/stale events'],
    [0,2,'Current provider shipment state',true], [5,4,'GET own order tracking; access token'],
    [4,3,'Check ownership; read each shipment'], [3,4,'Timeline, ETA, last update, exceptions',true],
    [4,5,'Tracking view; contact-support link',true], [5,4,'Refresh with ETag; back off offline']
  ], 'No customer cancellation action. Split shipments remain separate; stale data is labeled.\nDo not regress shipment state for late events or expose another customer\'s order by tracking ID.');

const booking = page('08-booking', '08  Booking', 'Miro section A | Customer journey through verified payment | Web, Android and iOS', 1800, 1020);
const bx = [60,400,740,1080,1420];
['Web / Android / iOS\nBrowse and sign in', 'Cognito federation\nGoogle, Microsoft, Apple', 'Catalog API + Valkey\nListings and current prices', 'Cart + delivery address\nCustomer-owned resources', 'Authoritative quote\nPrice, tax, discount, stock'].forEach((t,i)=>box(booking,`book${i}`,t,bx[i],200,280,100,i===0?'client':'compute'));
for(let i=0;i<4;i++)line(booking,`bookarrow${i}`,bx[i]+280,250,bx[i+1],250);
['Payment details to client\nRazorpay hosted checkout', 'RDS transaction\nPending order + reservation', 'Customer accepts quote\nIdempotent order request'].forEach((t,i)=>box(booking,`pay${i}`,t,[740,1080,1420][i],430,280,100,i===0?'external':'compute'));
line(booking,'downquote',1560,300,1560,430);
line(booking,'quotetodb',1420,480,1360,480);
line(booking,'dbtopay',1080,480,1020,480);
box(booking,'verified','Verified payment webhook\nInbox + paid transaction\nOrderPaid outbox event',400,430,280,100,'async');
line(booking,'paytov',740,480,680,480);
box(booking,'handoff','Post-Booking handoff\nOrderPaid routed through\nEventBridge + SQS',60,430,280,100,'async');
line(booking,'vtohandoff',400,480,340,480);
box(booking,'catalogsupport','Catalog operations\nAdmin / S3 / Scheduler -> import worker -> versioned PostgreSQL release -> outbox -> cache refresh\nPricing is computed on the server; stale browser prices require renewed customer acceptance.',60,640,1640,115,'data');
box(booking,'mediasupport','Product media\nSupplied artwork + generated mockups -> review -> S3 masters -> image derivatives / MediaConvert -> CloudFront\nAll three clients consume the same approved media metadata with platform-appropriate sizes.',60,785,1640,105,'data');
label(booking,'bookreview','Review: catalog source, tax/shipping rules, stock ownership, provider serviceability, identity migration and payment reconciliation.',60,925,1640,50,16);

const post = page('09-post-booking', '09  Post-Booking Operations', 'Miro section B | Fulfillment, delivery tracking, support and controlled cancellation', 1800, 1140);
['OrderPaid event\nEventBridge + SQS', 'Fulfillment worker\nIdempotent provider adapter', 'Amazon Shipping\nWellisha packs; Amazon delivers', 'Tracking inbox + worker\nNormalize provider updates', 'Web / Android / iOS\nTimeline, ETA, last update'].forEach((t,i)=>box(post,`post${i}`,t,bx[i],190,280,100,i===2?'external':i===4?'client':'async'));
for(let i=0;i<4;i++)line(post,`postarrow${i}`,bx[i]+280,240,bx[i+1],240);
label(post,'trackingapi','Tracking is served by the owner-authorized API from durable shipment state; webhooks and polling keep it current.',60,325,1640,55,16);
['Customer contacts support\nCase only; no cancellation', 'Authorized support agent\nMFA, role, reason, case ID', 'Cancellation worker\nRecord intent; serialize\nwith shipment submission', 'Provider cancellation\nAccepted / rejected / pending', 'Refund worker + Razorpay\nOnly after eligible outcome\nReconcile before completion'].forEach((t,i)=>box(post,`cancel${i}`,t,bx[i],450,280,115,i===0?'client':i===3?'external':'compute'));
for(let i=0;i<4;i++)line(post,`cancelarrow${i}`,bx[i]+280,507,bx[i+1],507);
label(post,'conditional','Provider rejection or dispatched shipment -> support explains the outcome / eligible return policy. No automatic cancellation from a customer case.',60,600,1640,60,16);
box(post,'notifications','Asynchronous customer updates\nBusiness outbox -> EventBridge -> separate email/SMS queues -> SES / AWS End User Messaging\nOrder, shipment, support, agent cancellation and refund updates; provider acceptance is not final delivery.',60,710,1640,110,'async');
box(post,'controls','Agent-only control boundary\nCustomer cancellation calls are forbidden by the API. Manual provider-portal actions require an audited case and reconciliation.\nSeparate order, shipment, cancellation and refund states; split shipments and partial refunds remain explicit.',60,865,1640,110,'neutral');
label(post,'postreview','Operations: retry budgets, DLQs, provider reconciliation, staff access review, support SLA and refund approval thresholds.',60,1010,1640,55,16);

sequence('10-media', '10  Product Media Publication', 'Approved product identity across web, Android and iOS | Originals preserved; delivery assets versioned',
  ['Merchandising', 'S3 master assets', 'EventBridge / SQS\nMedia worker', 'Image processing /\nMediaConvert', 'Catalog media records', 'CloudFront / clients'], [
    [0,1,'Upload original / generated review master'], [1,2,'Object-created event + asset version',true],
    [2,2,'Validate type, size, metadata; deduplicate'], [2,3,'Create bounded image/video derivatives',true],
    [3,1,'Write derivatives to separate output prefix'], [3,2,'Completion / failure event',true],
    [2,4,'Record ready variants; still unpublished'], [0,4,'Review branding, labels, video; approve version'],
    [4,5,'Publish immutable URLs + dimensions + alt text',true], [5,1,'Fetch approved derivative through origin access'],
    [5,5,'Choose viewport size / supported video format']
  ], 'Generated packaging is a mockup until approved. No processing loop: source and derivative prefixes differ.\nOnly public product media is CDN-readable; invoices, imports and customer data remain private.');

function textSVG(item, centered = false) {
  const lines = wrap(item.text, item.w - 18, item.size || 15);
  const size = item.size || 15; const lineHeight = size * 1.3;
  if (lines.length * lineHeight > item.h + 1) throw new Error(`Text overflow: ${item.id}`);
  const x = centered ? item.x + item.w / 2 : item.x + 9;
  const y = item.y + (item.h - lines.length * lineHeight) / 2 + size;
  return `<text font-family="Arial, sans-serif" font-size="${size}" fill="#202B37"${item.bold ? ' font-weight="700"' : ''}${centered ? ' text-anchor="middle"' : ''}>${lines.map((line, i) => `<tspan x="${x}" y="${y + i * lineHeight}">${escape(line)}</tspan>`).join('')}</text>`;
}

function renderSVG(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${p.width}" height="${p.height}" viewBox="0 0 ${p.width} ${p.height}"><title>${escape(p.title)}</title><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="#526779"/></marker></defs><rect width="100%" height="100%" fill="white"/>${p.edges.map(e => `<polyline points="${[[e.x1,e.y1],...e.points,[e.x2,e.y2]].map(pt=>pt.join(',')).join(' ')}" fill="none" stroke="#526779" stroke-width="1.6"${e.dashed ? ' stroke-dasharray="6 5"' : ''}${e.arrow ? ' marker-end="url(#arrow)"' : ''}/>`).join('')}${p.boxes.map(b=>`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="5" fill="${b.color}" stroke="#8291A0"/>${textSVG(b,true)}`).join('')}${p.texts.map(t=>textSVG(t)).join('')}</svg>`;
}

function renderDrawio(p) {
  const cells = ['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'];
  for (const b of p.boxes) cells.push(`<mxCell id="${b.id}" value="${escape(b.text)}" style="rounded=1;arcSize=6;whiteSpace=wrap;html=0;fontFamily=Arial;fontSize=15;fillColor=${b.color};strokeColor=#8291A0;fontColor=#202B37;spacing=9;" vertex="1" parent="1"><mxGeometry x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" as="geometry"/></mxCell>`);
  for (const t of p.texts) cells.push(`<mxCell id="${t.id}" value="${escape(t.text)}" style="text;html=0;whiteSpace=wrap;align=left;verticalAlign=middle;fontFamily=Arial;fontSize=${t.size};fontStyle=${t.bold?1:0};fontColor=#202B37;spacing=9;" vertex="1" parent="1"><mxGeometry x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" as="geometry"/></mxCell>`);
  for (const e of p.edges) cells.push(`<mxCell id="${e.id}" style="html=0;endArrow=${e.arrow?'block':'none'};endFill=1;strokeColor=#526779;strokeWidth=1.6;dashed=${e.dashed?1:0};" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${e.x1}" y="${e.y1}" as="sourcePoint"/><mxPoint x="${e.x2}" y="${e.y2}" as="targetPoint"/>${e.points.length?`<Array as="points">${e.points.map(([x,y])=>`<mxPoint x="${x}" y="${y}"/>`).join('')}</Array>`:''}</mxGeometry></mxCell>`);
  return `<diagram id="${p.id}" name="${escape(p.title)}"><mxGraphModel dx="1800" dy="1400" grid="1" gridSize="10" page="1" pageScale="1" pageWidth="${p.width}" pageHeight="${p.height}" math="0" shadow="0"><root>${cells.join('')}</root></mxGraphModel></diagram>`;
}

for (const p of pages) fs.writeFileSync(path.join(directory, `${p.id}.svg`), renderSVG(p));
const mermaidPages = pages.filter(p => p.sequence).map(p => {
  const { names, steps, notes } = p.sequence;
  const clean = value => value.replace(/\n/g, ' ').replace(/;/g, ',');
  const actors = names.map((name, i) => `    participant P${i} as ${clean(name)}`).join('\n');
  const messages = steps.map(([from, to, text, dashed]) => `    P${from}${dashed ? '-->>' : '->>'}P${to}: ${clean(text)}`).join('\n');
  return `## ${p.title}\n\n${p.subtitle}\n\n\`\`\`mermaid\nsequenceDiagram\n    autonumber\n${actors}\n${messages}\n    Note over P0,P${names.length - 1}: ${clean(notes)}\n\`\`\`\n`;
});
fs.writeFileSync(path.join(directory, 'sequences.md'), `# Wellisha Sequence Diagrams\n\nGenerated from the same flow definitions as the draw.io pages. Each diagram shows the main flow; its notes and the design document define failure handling and conditional outcomes. Customers can track deliveries and contact support; cancellation execution is agent-only.\n\n${mermaidPages.join('\n')}`);
fs.writeFileSync(path.join(directory, 'wellisha-aws.drawio'), `<?xml version="1.0" encoding="UTF-8"?><mxfile host="app.diagrams.net" type="device">${pages.map(renderDrawio).join('')}</mxfile>`);
fs.writeFileSync(path.join(directory, 'previews.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Wellisha AWS Architecture</title><style>body{margin:0;padding:24px;font:16px Arial,sans-serif;background:#e9edf0;color:#202b37}header,main{max-width:1800px;margin:auto}h1{font-size:26px}a{color:#145a9a}section{margin:24px 0;background:white;border:1px solid #cbd2da}img{display:block;width:100%;height:auto}nav{display:flex;flex-wrap:wrap;gap:18px}@media print{body{padding:0;background:white}header{display:none}section{break-after:page;border:0;margin:0}}</style></head><body><header><h1>Wellisha Essentials - Architecture Proposal</h1><p>Web, Android and iOS. Direct checkout with provider fulfillment.</p><nav><a href="wellisha-aws.drawio">Editable draw.io</a><a href="confluence-design.md">Design document</a>${pages.map(p=>`<a href="#${p.id}">${escape(p.title)}</a>`).join('')}</nav></header><main>${pages.map(p=>`<section id="${p.id}"><img src="${p.id}.svg" alt="${escape(p.title)}"></section>`).join('')}</main></body></html>`);
console.log(`Generated ${pages.length} diagram pages, SVG previews, and preview gallery.`);
