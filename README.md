# StateShift

StateShift is a demo-ready Next.js MVP for localizing semantic state changes in long videos with Gemini and a search strategy that uses far fewer model calls than exhaustive frame-by-frame scanning.

Given a video and a query like "Find when the bike disappears" or "Find when the door opens", the app:

1. uploads the video
2. extracts sampled frames with `ffmpeg`
3. asks Gemini to classify only selected sampled frames
4. uses bracketing + binary search to estimate the transition timestamp
5. shows before/after evidence frames, confidence, explanation, and the search trace

## Stack

- Next.js App Router
- TypeScript
- Gemini API via `@google/genai`
- `ffmpeg` for sampled frame extraction
- Local filesystem storage for uploads and frames

## Requirements

- Node.js 20+
- npm 10+
- `ffmpeg` installed and available on `PATH`
- Gemini API key

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required:

- `GEMINI_API_KEY`

Optional:

- `GEMINI_MODEL` defaults to `gemini-2.5-flash`

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How To Demo

1. Start the app with `npm run dev`
2. Upload a short local video with one clear state change
3. Enter a query such as:
   - `Find when the bike disappears`
   - `Find when the package is removed`
   - `Find when the door opens`
   - `Find when the room becomes empty`
4. Keep the default sampling rate of `1` fps for the initial demo
5. Run analysis and inspect the returned timestamp, evidence frames, confidence, and trace

## Notes

- The MVP assumes one main transition in a mostly monotonic video.
- Uploaded videos and extracted frames are stored under `storage/jobs`.
- The route handler reads the uploaded file into memory before persisting it, so use short demo videos locally.
- `ffmpeg` is required; the app will fail fast if it is missing.

## Verification

Recommended local checks:

```bash
npm run build
```

If you want a quick extraction smoke test, you can generate a short sample video with `ffmpeg` and run the app against it.
