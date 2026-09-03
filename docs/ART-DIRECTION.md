# Art direction — Sublime Pantry

Every image slot on the site is already built and already names the file it is
waiting for. Drop a correctly named file into `public/images/` and the slot
switches from its placeholder to the photograph on the next build — no code
change (see `src/lib/media.ts`).

Until then, card slots render the placeholder tile (brand tint, kicker, the
title's first letter) and the hero renders a brand-tint panel with the mark.
**Article hero slots render nothing at all** rather than a placeholder: a
placeholder above a byline reads as a missing photograph, and an article does
not need one to be complete.

---

## The rules

These are not stylistic preferences. They are the conditions under which a
photograph is allowed to appear on this site at all.

- **One kitchen, one day, ~24 frames.** Consistency of room, surface and light
  matters more than variety of subject.
- **Window light from one side.** No flash, no ring light, no bounce card
  fighting the window. Shadows fall the same direction in every frame.
- **Warm white balance**, matched across the set. The site ground is `#faf7f1`;
  photographs that read cool or grey will fight it.
- **No stock. No AI. Nothing generated.** Every frame is a photograph of this
  equipment in this kitchen.
- **Nothing staged to imply testing that has not happened.** We publish
  specification comparisons, not bench tests (see `/review-methodology`). A
  photograph that looks like a controlled test is a claim, and we have not
  earned it. No clipboards, no measurement rigs, no lab framing.
- **Real batches, real mess.** A slightly imperfect tray is honest. A styled
  flat-lay of props nobody used is not.
- **Hands, not faces**, except in the portrait.

---

## Shot list

### Hero and workspace

| File | Ratio | Frame |
| --- | --- | --- |
| `images/hero.jpg` | 16:9 | Hands loading prepared trays into the freeze dryer. Machine open, trays mid-slide, room readable behind. |
| `images/setup.jpg` | 16:9 | Wide of the whole workspace: machine, bench, packaging station in one frame. |

### Product — the packaging starter kit

Shot 4:5. These are the only images allowed to look composed, because they are
product photography. Plain surface, no props that are not in the box.

| File | Frame |
| --- | --- |
| `images/products/starter-kit-studio.jpg` | The kit as it arrives, square to camera, on a plain surface. |
| `images/products/starter-kit-in-use.jpg` | A bag being filled at the bench, absorber and label to hand. |
| `images/products/starter-kit-contents.jpg` | Everything unpacked and laid out: the three bag sizes, the three absorber sizes, the label sheet, the guide. |

Once shot, upload these to the Shopify product (Part I, item 55) and add their
CDN URLs to `images[]` in `src/lib/commerce.ts` with `source: 'own'`. The
product page captions any image whose `source` is `'manufacturer'`; our own
photographs carry no caption.

### Articles — one 16:9 frame per article

Named for the article slug, so `guides/complete-batch-workflow.jpg` fills the
hero on `/guides/complete-batch-workflow`. Add the file, then add the `image`
block to that article's JSON front matter (`src`, `alt`, and `credit` if the
photograph is not ours).

| File | Frame |
| --- | --- |
| `images/guides/complete-batch-workflow.jpg` | Finished trays, just out of the chamber, before packaging. |
| `images/guides/which-freeze-dryer.jpg` | The machine in its actual place in the room — clearance, outlet, drain hose visible. |
| `images/guides/cottage-economics.jpg` | Labelled sealed bags in a bin, ready to sell. |
| `images/troubleshooting/batch-not-dry.jpg` | A piece broken open to show a cool, dense centre. |
| `images/troubleshooting/chewy-candy.jpg` | Candy on a tray: some puffed, some not, in the same frame. |
| `images/troubleshooting/vacuum-error.jpg` | The door gasket and drain valve, close, in hand. |
| `images/troubleshooting/rehydration-problems.jpg` | Rehydration in a bowl, mid-process. |
| `images/troubleshooting/storage-failure.jpg` | A bag that lost its seal, next to one that held. |
| `images/compare/home-freeze-dryers.jpg` | Machine controls and spec plate, legible. |
| `images/compare/storage-containers.jpg` | Mylar, mason jar and PETE side by side, same food in each. |
| `images/guides/sealing.jpg` | The impulse sealer closing a filled bag. |
| `images/guides/water-activity.jpg` | The meter reading a finished sample. |

### Brand

| File | Ratio | Frame |
| --- | --- | --- |
| `images/../brand/author.jpg` (`public/brand/author.jpg`) | 1:1 | Jack at the machine. Working, not posed. Square crop, head and shoulders with the machine readable behind. |

The byline, the author bio and the About page all switch from the initials tile
to this photograph the moment `public/brand/author.jpg` exists.

---

## Delivery

- **Format:** JPEG, sRGB, quality ~82. No WebP source files — Astro's image
  service generates modern formats at build.
- **Size:** 16:9 at 2560×1440, 4:5 at 1600×2000, 1:1 at 1200×1200. Everything
  is downscaled at build; nothing is upscaled.
- **Naming:** exactly as above, lowercase, hyphens. The filename is the API.
- **Alt text is written with the article, not with the photograph.** It goes in
  the JSON front matter and describes what is shown, not what it illustrates.
