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
