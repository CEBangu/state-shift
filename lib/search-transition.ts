import { GeminiFrameClassifier, isAmbiguousClassification } from "@/lib/gemini-classifier";
import { formatTimestamp } from "@/lib/time-format";
import {
  ClassificationLabel,
  ClassifiedFrame,
  FrameClassification,
  FrameMetadata,
  SearchTraceEntry,
  TransitionResult,
} from "@/lib/types";

type SearchInput = {
  sampledFrames: FrameMetadata[];
  query: string;
};

type DecisivePoint = {
  index: number;
  frame: FrameMetadata;
  classification: FrameClassification;
};

function isDecisive(classification: FrameClassification): boolean {
  return !isAmbiguousClassification(classification);
}

function oppositeLabel(label: ClassificationLabel): ClassificationLabel | null {
  if (label === "present") {
    return "absent";
  }

  if (label === "absent") {
    return "present";
  }

  return null;
}

async function classifyIndex(
  frames: FrameMetadata[],
  classifier: GeminiFrameClassifier,
  trace: SearchTraceEntry[],
  index: number,
): Promise<DecisivePoint> {
  const frame = frames[index];
  const classification = await classifier.classifyForTrace(frame, trace);

  return {
    index,
    frame,
    classification,
  };
}

async function findNearestDecisive(
  frames: FrameMetadata[],
  classifier: GeminiFrameClassifier,
  trace: SearchTraceEntry[],
  centerIndex: number,
  preferredDirection: -1 | 1,
): Promise<DecisivePoint | null> {
  const distances = Array.from({ length: frames.length }, (_, distance) => distance);

  for (const distance of distances) {
    const primaryIndex = centerIndex + distance * preferredDirection;
    if (primaryIndex >= 0 && primaryIndex < frames.length) {
      const candidate = await classifyIndex(frames, classifier, trace, primaryIndex);
      if (isDecisive(candidate.classification)) {
        return candidate;
      }
    }

    if (distance === 0) {
      continue;
    }

    const secondaryIndex = centerIndex - distance * preferredDirection;
    if (secondaryIndex >= 0 && secondaryIndex < frames.length) {
      const candidate = await classifyIndex(frames, classifier, trace, secondaryIndex);
      if (isDecisive(candidate.classification)) {
        return candidate;
      }
    }
  }

  return null;
}

async function binarySearchTransition(
  frames: FrameMetadata[],
  classifier: GeminiFrameClassifier,
  trace: SearchTraceEntry[],
  lower: DecisivePoint,
  upper: DecisivePoint,
): Promise<{ before: DecisivePoint; after: DecisivePoint }> {
  let before = lower;
  let after = upper;

  while (after.index - before.index > 1) {
    const midpointIndex = Math.floor((before.index + after.index) / 2);
    const midpoint = await classifyIndex(frames, classifier, trace, midpointIndex);

    if (!isDecisive(midpoint.classification)) {
      const beforeIndex = before.index;
      const afterIndex = after.index;
      const left = midpointIndex - 1 > before.index ? await classifyIndex(frames, classifier, trace, midpointIndex - 1) : null;
      const right = midpointIndex + 1 < after.index ? await classifyIndex(frames, classifier, trace, midpointIndex + 1) : null;

      if (left && isDecisive(left.classification)) {
        if (left.classification.label === before.classification.label) {
          before = left;
        } else if (left.classification.label === after.classification.label) {
          after = left;
        }
      }

      if (right && isDecisive(right.classification)) {
        if (right.classification.label === before.classification.label) {
          before = right;
        } else if (right.classification.label === after.classification.label) {
          after = right;
        }
      }

      if (after.index - before.index <= 1) {
        break;
      }

      if (before.index === beforeIndex && after.index === afterIndex) {
        break;
      }

      continue;
    }

    if (midpoint.classification.label === before.classification.label) {
      before = midpoint;
      continue;
    }

    after = midpoint;
  }

  return { before, after };
}

async function verifyBoundary(
  frames: FrameMetadata[],
  classifier: GeminiFrameClassifier,
  trace: SearchTraceEntry[],
  before: DecisivePoint,
  after: DecisivePoint,
): Promise<{ before: DecisivePoint; after: DecisivePoint }> {
  const start = Math.max(0, before.index - 2);
  const end = Math.min(frames.length - 1, after.index + 2);

  const decisivePoints: DecisivePoint[] = [];

  for (let index = start; index <= end; index += 1) {
    const candidate = await classifyIndex(frames, classifier, trace, index);
    if (isDecisive(candidate.classification)) {
      decisivePoints.push(candidate);
    }
  }

  decisivePoints.sort((left, right) => left.index - right.index);

  let bestBefore = before;
  let bestAfter = after;
  let bestScore = Math.min(before.classification.confidence, after.classification.confidence);

  for (let index = 0; index < decisivePoints.length - 1; index += 1) {
    const current = decisivePoints[index];
    const next = decisivePoints[index + 1];

    if (current.classification.label === next.classification.label) {
      continue;
    }

    const score = Math.min(current.classification.confidence, next.classification.confidence);
    if (score >= bestScore) {
      bestBefore = current;
      bestAfter = next;
      bestScore = score;
    }
  }

  return { before: bestBefore, after: bestAfter };
}

async function findBracket(
  frames: FrameMetadata[],
  classifier: GeminiFrameClassifier,
  trace: SearchTraceEntry[],
): Promise<{ before: DecisivePoint; after: DecisivePoint }> {
  const first = await classifyIndex(frames, classifier, trace, 0);
  const last = await classifyIndex(frames, classifier, trace, frames.length - 1);

  if (
    isDecisive(first.classification) &&
    isDecisive(last.classification) &&
    first.classification.label !== last.classification.label
  ) {
    return { before: first, after: last };
  }

  const baseline = isDecisive(first.classification)
    ? first
    : await findNearestDecisive(frames, classifier, trace, 0, 1);

  if (!baseline || !oppositeLabel(baseline.classification.label)) {
    throw new Error("Could not establish a reliable starting state from the sampled frames.");
  }

  let previousSame = baseline;
  let step = 1;

  while (baseline.index + step < frames.length) {
    const candidateIndex = Math.min(frames.length - 1, baseline.index + step);
    const candidate = await classifyIndex(frames, classifier, trace, candidateIndex);

    if (isDecisive(candidate.classification)) {
      if (candidate.classification.label === baseline.classification.label) {
        previousSame = candidate;
      } else {
        return {
          before: previousSame,
          after: candidate,
        };
      }
    }

    if (candidateIndex === frames.length - 1) {
      break;
    }

    step *= 2;
  }

  for (let index = previousSame.index + 1; index < frames.length; index += 1) {
    const candidate = await classifyIndex(frames, classifier, trace, index);
    if (isDecisive(candidate.classification) && candidate.classification.label !== baseline.classification.label) {
      return {
        before: previousSame,
        after: candidate,
      };
    }

    if (isDecisive(candidate.classification) && candidate.classification.label === baseline.classification.label) {
      previousSame = candidate;
    }
  }

  throw new Error("No clear transition was found in the sampled frames.");
}

function toClassifiedFrame(point: DecisivePoint): ClassifiedFrame {
  return {
    ...point.frame,
    classification: point.classification,
  };
}

export async function searchTransition({
  sampledFrames,
  query,
}: SearchInput): Promise<TransitionResult> {
  if (sampledFrames.length < 2) {
    throw new Error("Need at least two sampled frames to localize a transition.");
  }

  const classifier = new GeminiFrameClassifier(query);
  const trace: SearchTraceEntry[] = [];

  const bracket = await findBracket(sampledFrames, classifier, trace);
  const narrowed = await binarySearchTransition(sampledFrames, classifier, trace, bracket.before, bracket.after);
  const verified = await verifyBoundary(sampledFrames, classifier, trace, narrowed.before, narrowed.after);

  const beforeFrame = toClassifiedFrame(verified.before);
  const afterFrame = toClassifiedFrame(verified.after);
  const confidence = Number(
    ((beforeFrame.classification.confidence + afterFrame.classification.confidence) / 2).toFixed(3),
  );
  const explanation = `Transition localized between sampled frames ${beforeFrame.sampleIndex} and ${afterFrame.sampleIndex}. Gemini judged the semantic state as ${beforeFrame.classification.label} before the change and ${afterFrame.classification.label} after it.`;

  return {
    transitionSampleIndex: afterFrame.sampleIndex,
    transitionTimestampSec: afterFrame.timestampSec,
    transitionTimestampHuman: formatTimestamp(afterFrame.timestampSec),
    beforeFrame,
    afterFrame,
    confidence,
    explanation,
    totalGeminiCalls: classifier.getCallCount(),
    searchTrace: trace,
  };
}
