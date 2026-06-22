// microCMS の接続情報を環境変数から読み、検証して返す。
//
// .env(.local) にサーバ専用の値として定義する（クライアントへ漏らさないため
// NEXT_PUBLIC_ / PUBLIC_ などの公開プレフィックスは付けない）:
//   MICROCMS_SERVICE_DOMAIN=your-service   ← https://your-service.microcms.io の "your-service"
//   MICROCMS_API_KEY=xxxxxxxxxxxx

export type MicroCMSConfig = {
  serviceDomain: string;
  apiKey: string;
};

export function getMicroCMSConfig(): MicroCMSConfig {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;

  const missing: string[] = [];
  if (!serviceDomain) missing.push('MICROCMS_SERVICE_DOMAIN');
  if (!apiKey) missing.push('MICROCMS_API_KEY');

  if (missing.length > 0) {
    throw new Error(
      `[microcms] 環境変数が未設定です: ${missing.join(', ')}。` +
        ' .env(.local) にサーバ専用の値として定義してください' +
        '（NEXT_PUBLIC_ / PUBLIC_ などの公開プレフィックスは付けない）。',
    );
  }

  return { serviceDomain: serviceDomain as string, apiKey: apiKey as string };
}
