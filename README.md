# StateShift

StateShift is an MVP for localizing semantic state changes in long videos with Gemini and a search strategy that uses far fewer model calls than exhaustive frame-by-frame scanning.

Given a video and a query like "Find when the bike disappears" or "Find when the door opens", the app:

1. uploads the video
2. extracts sampled frames with `ffmpeg`
3. asks Gemini to classify only selected sampled frames
4. uses bracketing + binary search to estimate the transition timestamp
5. shows before/after evidence frames, confidence, explanation, and the search trace

## Quick Start

Everything application-specific is in this repo, but to run it locally you still need:

- Node.js 20+
- npm 10+
- `ffmpeg` installed and available on `PATH`
- a valid Gemini API key

Setup:

```bash
npm install
cp .env.example .env.local
```

Then add your `GEMINI_API_KEY` to `.env.local`.

Run locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```
Open [http://localhost:3000](http://localhost:3000).

## How To Demo

1. Start the app with `npm run dev`
2. Upload a local video with a state change (although the state can also change back)
3. Enter a query that matches the action in the video, such as:
   - `Find when the bike disappears`
   - `Find when the package is removed`
   - `Find when the door opens`
   - `Find when the room becomes empty`
4. Keep the default sampling rate of `1` fps for the initial demo
5. Run analysis and inspect the returned timestamp, evidence frames, confidence, and trace

2 sample vidoes have been inlcuded in the repo: `bottle_knockover_30ms.mp4` and `bottle_updown_26s.mp4`. With the prompt "Find when the bottle gets
knocked over", you can get an idea of the power of the Geminin powered algorithm. The point of the "updown" video is to show that the state transition can
be found even if the state is reversed (i.e., even if the bottle is returned to its initial upright condition).

## Notes

- The MVP assumes one main transition in a mostly monotonic video.
- Uploaded videos and extracted frames are stored under `storage/jobs`.
- The route handler reads the uploaded file into memory before persisting it, so use short demo videos locally.
- `ffmpeg` is required; the app will fail fast if it is missing.

If you want a quick extraction smoke test, you can generate a short sample video with `ffmpeg` and run the app against it.
