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

/** media フィールドが返す画像オブジェクトの共通型（定義元）。ato-microcms-types の生成型はこれを import して共有する（各ドメイン型で重複定義しない）。 */
export type MicroCMSImage = { url: string; height: number; width: number };

/** apiFetch のうち、呼び出し側で指定したい通信オプションだけ受け渡す。 */
export type RequestOptions = Partial<
  Pick<ApiFetchOptions, 'timeoutMs' | 'retries' | 'retryBaseMs' | 'fetchOptions' | 'signal'>
>;

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

/**
 * microCMS の GET を 1 本に集約した内部ヘルパ。
 * URL 組立（contentId 有無）・認証ヘッダ・クエリ正規化・通信オプション透過をまとめる。
 * 公開関数（getList / getListDetail / getObject）はこれに型を与えるだけ。
 */
function get<T>(
  endpoint: string,
  contentId: string | undefined,
  queries: MicroCMSQueries | undefined,
  options: RequestOptions,
): Promise<T> {
  const { serviceDomain, apiKey } = getMicroCMSConfig();
  const base = `https://${serviceDomain}.microcms.io/api/v1/${endpoint}`;
  const url = contentId ? `${base}/${encodeURIComponent(contentId)}` : base;
  return apiFetch<T>(url, {
    headers: { 'X-MICROCMS-API-KEY': apiKey },
    query: normalizeQueries(queries),
    ...options,
  });
}

/** リスト取得: GET /api/v1/{endpoint} */
export function getList<E extends ListEndpoint>(
  endpoint: E,
  queries?: MicroCMSQueries,
  options: RequestOptions = {},
): Promise<MicroCMSListResponse<MicroCMSListContent<MicroCMSListEndpoints[E]>>> {
  return get(endpoint, undefined, queries, options);
}

/** 詳細取得: GET /api/v1/{endpoint}/{contentId} */
export function getListDetail<E extends ListEndpoint>(
  endpoint: E,
  contentId: string,
  queries?: MicroCMSQueries,
  options: RequestOptions = {},
): Promise<MicroCMSListContent<MicroCMSListEndpoints[E]>> {
  return get(endpoint, contentId, queries, options);
}

/** オブジェクト形式取得: GET /api/v1/{endpoint}（単一オブジェクトを返すエンドポイント） */
export function getObject<E extends ObjectEndpoint>(
  endpoint: E,
  queries?: MicroCMSQueries,
  options: RequestOptions = {},
): Promise<MicroCMSObjectEndpoints[E] & Partial<MicroCMSDate>> {
  return get(endpoint, undefined, queries, options);
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
  const baseLimit = Math.min(Math.max(perRequestLimit, 1), 100);

  const all: MicroCMSListContent<MicroCMSListEndpoints[E]>[] = [];
  let offset = queries.offset ?? 0;

  // 安全弁: 想定外の無限ループを防ぐページ数の上限。
  const hardPageCap = 100_000;
  for (let page = 0; page < hardPageCap; page++) {
    // 残り必要件数が 1 ページ未満なら、その分だけ取得して無駄打ちを避ける。
    const limit = Math.min(baseLimit, maxContents - all.length);
    const res = await getList(endpoint, { ...queries, limit, offset }, requestOptions);
    all.push(...res.contents);

    if (all.length >= maxContents) return all.slice(0, maxContents);

    offset += limit;
    if (offset >= res.totalCount || res.contents.length === 0) break;
  }

  return all;
}
