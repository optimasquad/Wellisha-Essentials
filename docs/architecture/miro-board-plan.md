# Miro Board Publication Plan

Target board: https://miro.com/app/board/uXjVEer-YZg=/

Status: updated October 4, 2026. Nineteen active review frames include the ten native diagrams, stack/decision reviews, UI wireframes, ECS/cache design and Amazon Shipping store-pickup integration. Confluence is synchronized; publication-record.json contains live IDs.

## Frame A - Booking

Lead diagram: `08-booking.svg` / `08-booking.png`.

Purpose: customer journey from sign-in and product discovery through durable payment confirmation.

- Web, Android, and iOS clients.
- Cognito federation for Google, Microsoft, and Apple.
- Product listings, async price publication, Valkey caching, and approved product media.
- Cart and delivery-address ownership.
- Authoritative checkout quote, tax/shipping/discount rules, stock reservation.
- Razorpay payment, verified webhook inbox, and `OrderPaid` event.

Supporting diagrams: `02-login`, `03-catalog`, `04-checkout`, and `10-media`.

Review notes: catalog source; price-change policy; physical stock ownership; identity migration; serviceability; payment mismatch and duplicate handling.

## Frame B - Post-Booking Operations

Lead diagram: `09-post-booking.svg` / `09-post-booking.png`.

Purpose: fulfillment and support after an order has been placed.

- Fulfillment worker and provider adapter.
- Shipment lifecycle, tracking events, provider polling, ETA and split shipments.
- Customer tracking on web, Android, and iOS.
- Contact-support case creation with no automatic cancellation.
- Authorized human agent cancellation, including audited provider-portal workflows.
- Conditional refunds, returns/RTO, reconciliation, and exception handling.
- Independent asynchronous email/SMS queues and delivery outcomes.

Supporting diagrams: `05-cancellation`, `06-notifications`, and `07-tracking`.

Prominent rule: **Customers can track deliveries and contact support. Only authorized agents can cancel. The API enforces this restriction.**

Review notes: provider contract; support coverage; cancellation cutoff; finance approval thresholds; refund timing; shipment exceptions.

## Shared Foundation

Place `01-architecture` below the two lifecycle frames, or as a reference within both. Include shared security, AWS deployment, observability, event delivery, and recovery notes. Link the Confluence-ready design document beside the diagrams.

## Publication Procedure (Completed)

1. Read the target board and existing object positions before adding anything.
2. Create two clearly labeled frames in available canvas space, preserving existing board content.
3. Add the Booking and Post-Booking lead diagrams, followed by supporting diagrams and review notes.
4. Prefer editable native Miro objects where the connected integration supports them. Otherwise add rendered diagrams and link the editable draw.io source; do not describe an uploaded image as a native editable diagram.
5. Add the source/revision date and shared architecture reference.
6. Read back created object IDs and frame links to verify the write, then report the board update.

Publication is complete. Booking and Post-Booking lead the board; seven detailed sequence frames and the shared AWS foundation follow. Failure Handling and Security and Decisions and Release Gates close the review. The draw.io source remains local because its Confluence attachment upload returned an authentication error; the editable Miro diagrams and Confluence design are available.
