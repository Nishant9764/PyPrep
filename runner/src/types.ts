/** What the API server may ask the runner to execute. Deliberately small and strictly validated. */
export interface TestSpec {
  args?: unknown[];
  kwargs?: Record<string, unknown>;
  expected?: unknown;
  stdout?: string;
  stdin?: string;
  inPlace?: boolean;
  program?: string;
}

export interface RunRequest {
  language: string;
  code: string;
  entry: string;
  tests: TestSpec[];
}

export interface TestResult {
  index: number;
  passed: boolean;
  actual?: string;
  stdout?: string;
  error?: string;
  skipped?: boolean;
  ms?: number;
}

export type RunStatus = 'ok' | 'timeout' | 'crashed' | 'output_limit';

export interface RunResponse {
  status: RunStatus;
  results: TestResult[];
  /** Human-readable note when status is not "ok". */
  message?: string;
}

/** A language adapter. Adding a new track language means adding one of these. */
export interface LanguageAdapter {
  language: string;
  run(req: RunRequest, slot: number): Promise<RunResponse>;
}
