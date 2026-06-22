// microCMS コンテンツ API（読み取り）の薄いラッパー。SDK 非依存・fetch のみ。
// 汎用の apiFetch（タイムアウト/リトライ/エラー処理）と env（APIキー検証）の上に構築する。
//
// エンドポイントは endpoints.ts に登録した名前だけを受け付け、戻り値の型も自動で決まる。
//
// 提供する取得パターン:
//   getList         リスト取得     GET /api/v1/{endpoint}
//   getListDetail   詳細取得       GET /api/v1/{endpoint}/{contentId}
//   getAllContents  全件取得       limit/offset を totalCount までループ
//   getObject       オブジェクト形式 GET /api/v1/{endpoint}（単一オブジェクト）

import { apiFetch, type ApiFetchOptions } from './api-client';
import { getMicroCMSConfig } from './env';
import type { MicroCMSListEndpoints, MicroCMSObjectEndpoints } from './endpoints';

/** 登録済みのリスト形式エンドポイント名。 */
export type ListEndpoint = keyof MicroCMSListEndpoints & string;
/** 登録済みのオブジェクト形式エンドポイント名。 */
export type ObjectEndpoint = keyof MicroCMSObjectEndpoints & string;

/** GET API のクエリパラメータ（フィールド型により使えないものもある）。 */
export type MicroCMSQueries = {
  draftKey?: string;
  limit?: number;
  offset?: number;
  orders?: string; // 例: '-publishedAt'
  q?: string; // 全文検索
  fields?: string | string[]; // 例: ['id', 'title']
  ids?: string | string[];
  filters?: string; // 例: 'category[equals]xxxxxx'
  depth?: 1 | 2 | 3;
  richEditorFormat?: 'html' | 'object';
};

export type MicroCMSListResponse<T> = {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
};

export type MicroCMSContentId = { id: string };
export type MicroCMSDate = {
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  revisedAt?: string;
};
/** リスト形式コンテンツに microCMS が付与する共通フィールドを合成した型。 */
export type MicroCMSListContent<T> = T & MicroCMSContentId & MicroCMSDate;

/** apiFetch のうち、呼び出し側で指定したい通信オプションだけ受け渡す。 */
export type RequestOptions = Pick<
  ApiFetchOptions,
  'timeoutMs' | 'retries' | 'retryBaseMs' | 'fetchOptions' | 'signal'
>;

function endpointUrl(serviceDomain: string, endpoint: string, contentId?: string): string {
  const base = `https://${serviceDomain}.microcms.io/api/v1/${endpoint}`;
  return contentId ? `${base}/${encodeURIComponent(contentId)}` : base;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { 'X-MICROCMS-API-KEY': apiKey };
}

/** 配列値（fields, ids）はカンマ区切りに、undefined は除外して正規化する。 */
function normalizeQueries(queries?: MicroCMSQueries): Record<string, string | number> | undefined {
  if (!queries) return undefined;
  const normalized: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(queries)) {
    if (value === undefined) continue;
    normalized[key] = Array.isArray(value) ? value.join(',') : value;
  }
  return normalized;
}

/** リスト取得: GET /api/v1/{endpoint} */
export async function getList<E extends ListEndpoint>(
  endpoint: E,
  queries?: MicroCMSQueries,
  options: RequestOptions = {},
): Promise<MicroCMSListResponse<MicroCMSListContent<MicroCMSListEndpoints[E]>>> {
  const { serviceDomain, apiKey } = getMicroCMSConfig();
  return apiFetch<MicroCMSListResponse<MicroCMSListContent<MicroCMSListEndpoints[E]>>>(
    endpointUrl(serviceDomain, endpoint),
    { headers: authHeaders(apiKey), query: normalizeQueries(queries), ...options },
  );
}

/** 詳細取得: GET /api/v1/{endpoint}/{contentId} */
export async function getListDetail<E extends ListEndpoint>(
  endpoint: E,
  contentId: string,
  queries?: MicroCMSQueries,
  options: RequestOptions = {},
): Promise<MicroCMSListContent<MicroCMSListEndpoints[E]>> {
  const { serviceDomain, apiKey } = getMicroCMSConfig();
  return apiFetch<MicroCMSListContent<MicroCMSListEndpoints[E]>>(
    endpointUrl(serviceDomain, endpoint, contentId),
    { headers: authHeaders(apiKey), query: normalizeQueries(queries), ...options },
  );
}

/** オブジェクト形式取得: GET /api/v1/{endpoint}（単一オブジェクトを返すエンドポイント） */
export async function getObject<E extends ObjectEndpoint>(
  endpoint: E,
  queries?: MicroCMSQueries,
  options: RequestOptions = {},
): Promise<MicroCMSObjectEndpoints[E] & Partial<MicroCMSDate>> {
  const { serviceDomain, apiKey } = getMicroCMSConfig();
  return apiFetch<MicroCMSObjectEndpoints[E] & Partial<MicroCMSDate>>(
    endpointUrl(serviceDomain, endpoint),
    { headers: authHeaders(apiKey), query: normalizeQueries(queries), ...options },
  );
}

export type GetAllOptions = RequestOptions & {
  /** 1 リクエストあたりの取得件数。既定 100（microCMS の上限）。 */
  perRequestLimit?: number;
  /** 取得する最大件数。既定は全件。 */
  maxContents?: number;
};

/**
 * 全件取得: limit/offset を totalCount までループして連結する。
 * レート制限に配慮して直列で取得する。
 */
export async function getAllContents<E extends ListEndpoint>(
  endpoint: E,
  queries: MicroCMSQueries = {},
  options: GetAllOptions = {},
): Promise<MicroCMSListContent<MicroCMSListEndpoints[E]>[]> {
  const { perRequestLimit = 100, maxContents = Infinity, ...requestOptions } = options;
  const limit = Math.min(Math.max(perRequestLimit, 1), 100);

  const all: MicroCMSListContent<MicroCMSListEndpoints[E]>[] = [];
  let offset = queries.offset ?? 0;

  // 安全弁: 想定外の無限ループを防ぐページ数の上限。
  const hardPageCap = 100_000;
  for (let page = 0; page < hardPageCap; page++) {
    const res = await getList(endpoint, { ...queries, limit, offset }, requestOptions);
    all.push(...res.contents);

    if (all.length >= maxContents) return all.slice(0, maxContents);

    offset += limit;
    if (offset >= res.totalCount || res.contents.length === 0) break;
  }

  return all;
}
