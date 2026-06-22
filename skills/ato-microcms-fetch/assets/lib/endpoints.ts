// プロジェクトの microCMS API スキーマを「エンドポイント名 → コンテンツ型」で登録する。
// ここに登録したエンドポイントだけが getList / getListDetail / getAllContents / getObject で
// 受け付けられ、戻り値の型も自動で決まる（未登録名は型エラーになる）。
//
// 使い方: 自分の型を import（または直接定義）し、下のマップに 1 行ずつ足す。
//
// NOTE: 未登録（空）のうちは @typescript-eslint/no-empty-object-type で lint が落ちるため
// 各 interface に eslint-disable を付けてある。エンドポイントを 1 つでも登録したら、その
// interface の eslint-disable 行は不要になるので外すこと（空のままの side は残す）。

// import type { NewsType } from '@/types/news';

/**
 * リスト形式 API（contents 配列を返す）。
 * 値はコンテンツ 1 件分の型（id / createdAt 等の共通フィールドはライブラリ側で自動付与）。
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 登録ゼロの registry。登録したら外す。
export interface MicroCMSListEndpoints {
  // news: NewsType;
  // blogs: { title: string; body: string };
}

/**
 * オブジェクト形式 API（単一オブジェクトを返す）。
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 登録ゼロの registry。登録したら外す。
export interface MicroCMSObjectEndpoints {
  // config: { siteTitle: string };
}
