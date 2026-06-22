// 汎用 fetch ラッパー。microCMS 非依存なので、他の REST API でも再利用できる。
//
// 組み込み済みの考慮点:
// - タイムアウト（AbortSignal.timeout で試行ごとに打ち切り）
// - リトライ（429 / 408 / 5xx / ネットワーク断のみ。指数バックオフ＋ジッタ。
//   Retry-After / X-RateLimit-Reset ヘッダを尊重）
// - 型付きエラー（HttpError にステータス・URL・レスポンスボディを保持）
// - クエリ組立（URLSearchParams で安全にエンコード）
// - fetch オプション透過（Next.js の next:{revalidate,tags} や cache をそのまま渡せる）
//
// 標準 fetch のみ使用。Node 18+ / Edge / モダンブラウザで動作する。

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;

export type NextFetchOptions = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

export type ApiFetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  query?: QueryParams;
  /** JSON 化して送るボディ（GET では未使用）。 */
  body?: unknown;
  /** タイムアウト(ms)。既定 10000。 */
  timeoutMs?: number;
  /** リトライ最大回数（初回を除く）。既定 3。0 で無効。 */
  retries?: number;
  /** バックオフの基準待ち時間(ms)。既定 500。 */
  retryBaseMs?: number;
  /** fetch にそのまま渡す追加オプション（cache, next 等）。 */
  fetchOptions?: NextFetchOptions;
  /** 呼び出し側からの中断シグナル（タイムアウトと統合される）。 */
  signal?: AbortSignal;
};

export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly body: unknown;

  constructor(params: { status: number; statusText: string; url: string; body: unknown }) {
    super(`[http] ${params.status} ${params.statusText} (${params.url})`);
    this.name = 'HttpError';
    this.status = params.status;
    this.statusText = params.statusText;
    this.url = params.url;
    this.body = params.body;
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_BASE_MS = 500;
const HARD_RETRY_CAP = 20;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function buildUrl(baseUrl: string, query?: QueryParams): string {
  if (!query) return baseUrl;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/** Retry-After（秒 or HTTP-date）/ X-RateLimit-Reset（Unix 秒）を待ち時間(ms)へ。 */
function retryAfterMs(headers: Headers): number | null {
  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    const asNum = Number(retryAfter);
    if (!Number.isNaN(asNum)) return asNum * 1000;
    const asDate = Date.parse(retryAfter);
    if (!Number.isNaN(asDate)) return Math.max(0, asDate - Date.now());
  }
  const reset = headers.get('x-ratelimit-reset');
  if (reset) {
    const resetSec = Number(reset);
    if (!Number.isNaN(resetSec)) return Math.max(0, resetSec * 1000 - Date.now());
  }
  return null;
}

function backoffMs(attempt: number, baseMs: number): number {
  const exponential = baseMs * 2 ** attempt;
  const jitter = Math.random() * baseMs; // サンダリングハード回避のジッタ
  return exponential + jitter;
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function combineSignals(timeout: AbortSignal, caller?: AbortSignal): AbortSignal {
  if (!caller) return timeout;
  // AbortSignal.any は Node 20+/モダンブラウザ。無ければタイムアウトを優先。
  const anyFn = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  return typeof anyFn === 'function' ? anyFn([caller, timeout]) : timeout;
}

/**
 * JSON を返す REST API への汎用 fetch。非 2xx は HttpError を投げる。
 * @typeParam T レスポンス JSON の型
 */
export async function apiFetch<T>(baseUrl: string, options: ApiFetchOptions = {}): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    query,
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryBaseMs = DEFAULT_RETRY_BASE_MS,
    fetchOptions = {},
    signal,
  } = options;

  const url = buildUrl(baseUrl, query);
  const finalHeaders: Record<string, string> = { ...headers };
  let serializedBody: BodyInit | undefined;
  if (body !== undefined) {
    serializedBody = JSON.stringify(body);
    if (!finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json';
  }

  const maxRetries = Math.min(Math.max(retries, 0), HARD_RETRY_CAP);
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    try {
      const res = await fetch(url, {
        ...fetchOptions,
        method,
        headers: finalHeaders,
        body: serializedBody,
        signal: combineSignals(timeoutSignal, signal),
      });

      if (res.ok) {
        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
      }

      const errorBody = await readBody(res);
      if (isRetriableStatus(res.status) && attempt < maxRetries) {
        await sleep(retryAfterMs(res.headers) ?? backoffMs(attempt, retryBaseMs));
        continue;
      }
      throw new HttpError({
        status: res.status,
        statusText: res.statusText,
        url,
        body: errorBody,
      });
    } catch (error) {
      if (error instanceof HttpError) throw error; // リトライ不可の HTTP エラー
      lastError = error; // ネットワーク断・タイムアウト等
      if (attempt < maxRetries) {
        await sleep(backoffMs(attempt, retryBaseMs));
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error('[http] 不明なエラーで失敗しました');
}
