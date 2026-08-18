# 4-method Multi-Agent Speech Comparator

同じ音声チャンクを4方式へ同時配信し、各Node/Agentの推論時間と2D出力を比較するGitHub Pages向け実験アプリです。

## 4方式

1. 現在版: Web Speech → multilingual MiniLM → cosine anchor mapping → JS visualization
2. 階層型: Whisper → MiniLM → multilingual sentiment Transformer → GPT scientific-inquiry → 2D
3. 機能分担: Whisper + emotion Transformer + GPT Inquiry + MediaPipe Pose → JS visualization
4. 異種統合: Whisper → RoBERTa + GPT Inquiry + Gemma + multilingual-E5 → GPT Integration → 2D

## 実行モード

- `録音開始`: マイクを5秒（変更可能）ごとにチャンク化し、同じチャンクを4方式へ並列投入します。
- `デモ文で実行`: 音声モデルを待たずにUIとパイプラインを確認します。Speech nodeは `fallback / demo text bypass` と表示されます。
- 初期化時間（モデルダウンロード/ロード）と推論時間を分離して記録します。
- CSV保存でNode単位の測定結果を保存できます。

## LLM / Gemmaについて

GitHub Pagesに秘密鍵を埋め込まないため、GPTとGemmaは安全なProxy/推論サーバーをURLで指定するAdapter設計です。Endpointが未設定または失敗した場合は、アプリを止めずにローカルの決定的フォールバックへ切り替え、UIの状態列に `fallback` と表示します。

期待するPOST形式（例）:

```json
{
  "role": "inquiry",
  "text": "葉っぱは光の方を向くの？",
  "output": "json scores 0..1"
}
```

Proxyは用途に応じてJSONを返します。Inquiryでは `score`、Integrationでは `x` と `y`（-1..1）を返すとそのまま利用されます。

## Browser-side models

- ASR: `onnx-community/whisper-tiny`
- MiniLM: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`
- E5: `Xenova/multilingual-e5-small`
- multilingual sentiment: `Xenova/bert-base-multilingual-uncased-sentiment`
- RoBERTa sentiment: `Xenova/twitter-roberta-base-sentiment-latest`
- Pose: MediaPipe Pose Landmarker Lite

モデルは初回アクセス時にCDN / Hugging Faceから読み込まれるため、初回は時間と通信量が大きくなります。

## GitHub Pages

`multi-method-compare/` をリポジトリに置き、Pagesを有効化してください。HTTPSが必要なマイク/カメラAPIと相性がよく、GitHub PagesのHTTPS URLから実行できます。
