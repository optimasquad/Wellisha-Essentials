# Wellisha AWS Architecture Proposal

Status: agreed design with implementation in progress. See [execution status](../implementation/execution-status.md) for verified foundation work and remaining release gates. The diagrams describe the target architecture; no AWS deployment has been executed.

## Deliverables

- [AWS deployment plan](../implementation/aws-deployment-plan.md): CDK/CloudFormation infrastructure and CodePipeline/CodeBuild releases, immutable image promotion, controlled initialization, IAM and rollback. Foundation definitions exist; staging and production deployment remain pending.

- [Implementation code plan](../implementation/code-plan.md): Kotlin/Spring Boot modules, API contracts, PostgreSQL migrations, security requirements, dependency-ordered work packages and release evidence. Website UI remains TypeScript/React/Next.js; native UI is proposed TypeScript/React Native/Expo. Separate ECS services, public-content caching and durable asynchronous order handling are specified.
- [Test-case specification](../implementation/test-cases.md): planned unit, PostgreSQL integration, security, WireMock, AWS and UI end-to-end cases. A subset has executable coverage; consult execution status for actual results.
- [UI and deployment canvas](../implementation/wireframes/live.canvas.xml): four editable Miro frames covering eight initial UI screens, plus the ECS/cache/asynchronous response frame. Placeholder imagery and prices require product approval.
- [Confluence-ready design](confluence-design.md): requirements, decisions, AWS services, data ownership, failure handling, implementation stages, and review comments.
- [Editable draw.io diagrams](wellisha-aws.drawio): ten pages, including AWS architecture, Booking/Post-Booking overviews, and seven sequence diagrams.
- [Diagram previews](previews.html): a local, printable gallery of the same diagrams.
- [Mermaid sequence source](sequences.md): text-based sequence diagrams for supported Confluence macros or future editing.
- [Sources](sources.md): official documentation and integration evidence.
- [Miro board publication](miro-board-plan.md): ten clean native flow layouts and three review sections. The readable review uses coloured boxes, 33-point box text, 67-point titles and spaced sequence messages; current object IDs are recorded in `publication-record.json`.
- Confirmed backend: Kotlin + Spring Boot with PostgreSQL. [Stack and data flexibility](https://miro.com/app/board/uXjVEer-YZg=/?moveToWidget=3458764685968990781) covers typed core tables, JSONB extensions, controlled Flyway migrations, repository boundaries and security. JVM 21 / Amazon Corretto remains proposed; implementation is pending.
- [Current Miro canvas](miro-repair/live.canvas.xml): read-back of the clean published layouts with live widget IDs. Superseded frames and diagram editor panels are archived at x=20000.
- [Product media gallery](../media/index.html): two generated packaging mockups and the supplied video.

## Confluence Page Structure

Create a parent page named **Wellisha Essentials - AWS Architecture** and use the numbered sections in `confluence-design.md`. Add a table-of-contents macro. Attach `wellisha-aws.drawio` and the SVG diagrams, then embed each page using the draw.io macro if the Confluence instance has that app. Otherwise use exported images; Markdown and Mermaid rendering depend on the installed Confluence editor and apps.

The full design and implementation plan are saved in the existing [Confluence architecture document](https://wellisha-team.atlassian.net/wiki/spaces/~712020a05862447af14967a08c13aaed292476/pages/65927), preserving its original requirements and whiteboard. The `Review comment` paragraphs are discussion prompts in the document, not separate posted comments. All nineteen current Miro frames are linked. The local draw.io source was not attached because the upload returned an authentication error.

## Diagram Pages

1. AWS high-level architecture.
2. Federated login for web and mobile.
3. Asynchronous catalog and price publication.
4. Checkout, verified payment, and fulfillment.
5. Agent-only cancellation and refund orchestration.
6. Asynchronous email and SMS.
7. Customer delivery tracking.
8. Booking overview for Miro.
9. Post-Booking Operations overview for Miro.
10. Product media publication.

The SVG previews and draw.io XML are generated from one geometry source. To regenerate after editing that source:

```powershell
node docs/architecture/generate-diagrams.mjs
```

Edits made directly in draw.io are not imported back into the generator. Choose one editing workflow to avoid overwriting visual changes.

The separate Miro layout generator is `rebuild-miro.mjs`. Its SVG and PNG previews are in `miro-repair/`. Running it prepares local layouts only; use the recorded live widget IDs when updating Miro to avoid duplicate review frames. Confluence links have been updated to the clean frames.


Amazon Shipping is the selected carrier for Wellisha-packed parcels. See [integration requirements and architecture](../implementation/amazon-shipping-integration.md) and the new Shipping Miro frame recorded in publication-record.json. Commercial/API onboarding and implementation remain pending.

## Pricing rules

The API-controlled pricing design is documented in
[pricing rules and worked examples](../implementation/pricing-rules.md).
Download the [SVG rules diagram](pricing-rules.svg); agent guidance is in
[.agents/pricing-rules.md](../../.agents/pricing-rules.md).
