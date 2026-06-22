// プロジェクトの microCMS API スキーマを「エンドポイント名 → コンテンツ型」で登録する。
// ここに登録したエンドポイントだけが getList / getListDetail / getAllContents / getObject で
// 受け付けられ、戻り値の型も自動で決まる（未登録名は型エラーになる）。
//
// 使い方: 自分の型を import（または直接定義）し、下のマップに 1 行ずつ足す。

// import type { NewsType } from '@/types/news';

/**
 * リスト形式 API（contents 配列を返す）。
 * 値はコンテンツ 1 件分の型（id / createdAt 等の共通フィールドはライブラリ側で自動付与）。
 */
export interface MicroCMSListEndpoints {
  // news: NewsType;
  // blogs: { title: string; body: string };
}

/**
 * オブジェクト形式 API（単一オブジェクトを返す）。
 */
export interface MicroCMSObjectEndpoints {
  // config: { siteTitle: string };
}
