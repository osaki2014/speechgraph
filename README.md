# Realtime Speech AI Pipeline — GitHub Pages Demo

同じユーザー体験を、2種類のアーキテクチャで比較する静的Webアプリです。

## 1. agent-pipeline/
独立エージェント型。Speech / Text / Semantic / Mapping / Visualization の5タスクを分離しています。AI意味解析と2D射影は Web Worker で独立実行され、イベントバスでパイプライン接続します。

## 2. monolithic/
従来型。音声認識→テキスト処理→意味解析→2D分類→描画を `app.js` 1本で順番に処理します。

## 2次元軸
- X: -1 = 分析的 / +1 = 感情的
- Y: -1 = 個人的 / +1 = 社会・外界志向

現段階は研究用プロトタイプとして、文章埋め込みと語彙アンカーを合成したスコアです。心理尺度として妥当性検証済みの分類ではありません。

## 動作方法
ローカルでは `file://` ではなくHTTPサーバーで開いてください。

```bash
python3 -m http.server 8000
```

- Agent版: http://localhost:8000/agent-pipeline/
- Monolithic版: http://localhost:8000/monolithic/

## GitHub Pages
リポジトリ直下にこの2フォルダとREADMEを置き、Settings → Pages → Deploy from a branch → `main` / `/ (root)` を選択します。

公開URL例:
- `https://USERNAME.github.io/REPO/agent-pipeline/`
- `https://USERNAME.github.io/REPO/monolithic/`

## ブラウザ
SpeechRecognition の対応差があるため Chrome / Edge / Safari を推奨します。初回利用時にマイク権限を許可してください。

## AIモデル
Transformers.js と `Xenova/paraphrase-multilingual-MiniLM-L12-v2` をCDN/Hugging Faceから読み込みます。初回はモデル取得に通信が必要です。モデル読込に失敗した場合はデモ継続用の軽量フォールバック特徴量に切り替わります。

## 次の研究実装候補
1. 音声認識も Whisper / whisper.cpp / Transformers.js に置換して完全ローカル化
2. 2D軸を研究仮説に合わせて変更
3. UMAP / PCA による発話群の相対配置
4. 話者分離・感情・発話行為・質問/説明/相槌分類エージェント追加
5. JSON/CSVログ保存
6. POSTER_V2等の表情分析結果との時刻同期


## NEW: 4-method comparison workbench

`multi-method-compare/` では、同じ入力を4種類のマルチエージェント/ハイブリッド構成へ並列投入し、Agentごとのモデル、初期化時間、推論時間、総遅延、2次元出力を比較できます。GPT/Gemmaは安全な外部Endpointを設定するAdapter方式で、未設定時はfallbackを明示します。
