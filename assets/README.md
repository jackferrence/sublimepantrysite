# Photography originals

Full-resolution sources for the asset library. `assets/sources.json` maps each
one to its id and the crops it can support; `src/lib/assets.ts` is the manifest
templates actually read.

## Regenerating derivatives

```
node assets/build-derivatives.mjs          # write public/images/library/**
node assets/build-derivatives.mjs --check  # report, write nothing
```

Output is committed, so a normal `npm run build` never runs this and never
needs sharp. Run it when photography lands or when an entry's `ratios` change,
then commit `public/images/library/`.

The generator refuses two things rather than trusting whoever runs it: it will
not upscale past the cropped width, and it throws if a declared ratio crops
below the 400px floor. Both have already caught real mistakes — a strawberry
crop that could not make a clean 4:5, and a banana shot 200px tall that could
not make any declared ratio at all.

## Verify by measuring the output

Two bugs in this pipeline had the same shape: a sharp call returned successfully,
returned plausible-looking values, and was reading the wrong thing.

- Chaining `.resize()` twice does not crop then scale. The second call replaces
  the first, so every derivative silently kept the original aspect ratio — a
  "1:1" that was 800×1199. Nothing threw.
- `.stats()` on a chained pipeline reads the *source* image and ignores the
  `.extract()` in front of it, so every pile in a contact sheet reported
  identical mean colour and the fruit classifier was meaningless.

Neither was visible in the exit code, the log line, or the file count. Both were
obvious the moment the output was measured — `sips -g pixelWidth` on the written
file, and looking at the crops.

So: after changing anything here, check the artifacts, not the return values.
`--check` tells you what *would* be written; it does not tell you the pixels are
right. `tests/assets.test.mjs` measures what is on disk against what the manifest
claims, which is why it caught the `fit: 'contain'` width-ladder mismatch.

## Originals kept outside git

Three files exceed 5 MB and are gitignored:

| File | Size | Where it is |
|---|---|---|
| `camp-pouch-freeze-dried-vegetables.png` | 22 MB | Canva, `jackferrence11's team`, doc `DAHUWUU4aDI` |
| `camp-pouch-rehydrated-chili.png` | 20 MB | Canva, `jackferrence11's team`, doc `DAHUWa8sQls` |
| `freeze-dryer-pair-loaded-trays.jpeg` | 7.3 MB | Adobe Stock `AdobeStock_2118571326` |

Their derivatives are committed, so the site builds and every test passes
without them. Only re-running the generator needs them restored.

## What is not here

`AdobeStock_326334834` — a camping shot of an open pouch beside a camp stove,
and the only subject-appropriate camping photograph in the delivered batch. The
supplied file was the unlicensed comp: the agency ID is rendered into the pixels
down the left edge. Licence that ID and it can be onboarded; the comp cannot.
