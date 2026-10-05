# Wellisha Media Curation

Prepared October 4, 2026 using the built-in image-generation tool. Originals in `F:\Idea Projects\Images and Videos` were preserved. Open [the preview gallery](index.html) to review the deliverables and video.

## Assets

| Asset | Workspace path | Intended use |
| --- | --- | --- |
| Square carton packshot | `storefront/public/media/curated/wellisha-xxl-15-packshot-v1.png` | Product listing/detail and mobile product screens |
| Wide carton banner | `storefront/public/media/curated/wellisha-xxl-15-banner-v1.png` | Web hero with separately rendered text; use square art direction on narrow screens |
| Original video, unchanged | `storefront/public/media/videos/wellisha-brand-original-v1.mp4` | User-initiated brand/product video player |

The package reference is the 15-pad, 320 mm Ultra Thin XXL carton. No other SKU was supplied. The two generated images are packaging mockups, not photographs of the manufactured product. The front branding and main specifications were visually checked against the reference. Small print, logo geometry, side-panel placement, and exact final production colors still require brand review. Do not use generated small print as a legal label, barcode, or product specification source.

## Source Inventory

| Source filename | Description |
| --- | --- |
| `WhatsApp Image 2026-10-04 at 1.12.04 PM.jpeg` | Close-up of sports illustration and sanitary-pad front panel |
| `WhatsApp Image 2026-10-04 at 1.12.18 PM.jpeg` | Full flattened carton dieline; primary packaging reference |
| `WhatsApp Video 2026-10-04 at 1.11.56 PM.mp4` | Supplied H.264 video; 1920 x 1080, 30 fps, approximately 70.055 seconds, 28,792,233 bytes |

## Publication Guidance

- Keep PNGs as review masters. The planned AWS pipeline produces WebP/AVIF and JPEG fallbacks at explicit responsive widths without upscaling.
- Use the square packshot on mobile instead of cropping the product out of the wide banner. Render headings, price, and calls to action in HTML/native text.
- Retain the video as supplied for review. It has not been re-edited, newly generated, audio-mastered, or transcoded. A browser frame review checks visual decoding, not every platform or audio rights.
- Chrome successfully decoded sample frames at 2, 20, 40, and 60 seconds; see `video-review.png`. A small corner mark remains visible in the supplied footage, and the video shows a soft-looking pack while the artwork supplied separately is a carton dieline. Confirm which packaging is current before combining both in a published campaign.
- For production, create fast-start H.264/AAC MP4 and, if justified by playback volume, an HLS ladder through MediaConvert. Provide a poster, captions where speech exists, controls, `playsinline`, and metadata-only preload. Avoid automatic sound and respect reduced motion.
- Store source and approved derivatives in separate S3 prefixes; publish immutable versioned CloudFront URLs after approval. Record approval and source provenance per asset.
- These assets are available in the project, but no product database records or live website placements were changed during the architecture/media preparation task.

See [the exact prompt set](prompts.md) and [the AWS design](../architecture/confluence-design.md). No new video-generation tool was used; the supplied video is the delivered video asset.
