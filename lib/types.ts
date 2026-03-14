export type ClassificationLabel = "present" | "absent" | "uncertain";

export type FrameMetadata = {
  sampleIndex: number;
  timestampSec: number;
  imagePath: string;
  imageName: string;
};

export type FrameClassification = {
  label: ClassificationLabel;
  confidence: number;
  reason: string;
};

export type SearchTraceEntry = {
  sampleIndex: number;
  timestampSec: number;
  label: ClassificationLabel;
  confidence: number;
  reason: string;
};

export type ClassifiedFrame = FrameMetadata & {
  classification: FrameClassification;
};

export type TransitionResult = {
  transitionSampleIndex: number;
  transitionTimestampSec: number;
  transitionTimestampHuman: string;
  beforeFrame: ClassifiedFrame;
  afterFrame: ClassifiedFrame;
  confidence: number;
  explanation: string;
  totalGeminiCalls: number;
  totalSampledFrames: number;
  linearScanGeminiCalls: number;
  geminiCallsSaved: number;
  geminiReductionRatio: number;
  searchTrace: SearchTraceEntry[];
};

export type TransitionSearchResult = Omit<
  TransitionResult,
  "totalSampledFrames" | "linearScanGeminiCalls" | "geminiCallsSaved" | "geminiReductionRatio"
>;
