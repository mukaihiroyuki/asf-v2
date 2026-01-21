---
name: asf_iron_rules
description: ASF 2.0: 「三重の防御壁」と Next.js 開発の技術憲法。
---

# ASF 2.0 Iron Rules: The Triple Safety Net

このドキュメントは、ASF 2.0 開発において AI エージェント（私）が遵守すべき**絶対的な設計原則**である。

## 1. 三重の防御壁 (The Triple Safety Net)

1. **ポカヨケ (Frontend Validation)**:
   - **原則**: ユーザーが間違える余地を UI で物理的に封じる。
   - **実装**: 入力欄の制限、動的バリデーション、クリップボード同期の自動化。

2. **温慈のボット (Forgiving API Logic)**:
   - **原則**: バックエンド（GAS）は「不完全なデータ」も受け入れ、修復して保存する。
   - **実装**: `TextFinder` による動的列特定。スプシの構造変更に耐える柔軟な書き込みロジック。

3. **確定照合 (Human-in-the-loop Verification)**:
   - **原則**: 金額等の核心データは、システムだけで完結させず「人間の目」を通す。
   - **実装**: 「照合待ち」ステータスの導入。

## 2. 開発の掟 (Technical Commandments)

- **Atomic Design**: 2000行のモノリスは死罪。UI は React コンポーネントに細分化し、責務を分離する。
- **Stateless Communication**: `google.script.run` に依存せず、Vercel ↔ GAS 間は標準的な **JSON API (fetch)** で通信する。
- **UX > Tech**: テクノロジーの凄さより、営業マンが「1秒で終わる」体験を優先する。
- **Always Seed**: 重要な意思決定や変更は、必ず Obsidian の `Seeds` または `PROJECT_CONTEXT.md` に記録する。

## 3. システム識別子 (Ground Truth)

- **Master DB (全面談合算)**: `1xnN8CSq-9DyyhwJZayHkoJKBkcR9nGRZEsSr_r6SLfg`
- **Auth Master (認証マスタ)**: `1bKiuaQQOBijQSVU9oLtvxgoYE2Xb_9klwWaJ5YLs4UQ`
- **GAS Web App URL (Primary)**: `https://script.google.com/macros/s/AKfycbwSlxiqkUSSElraQ-nVXRWsWMwVhkXcpphkN7OkgVqBia9xgIvid0OI3UcZS9SC8u2t/exec`
  - ※ 営業マンのPIN認証、および担当者ごとの個別シートIDを管理。
  - **🚨注意**: IDの大文字小文字を1文字でも間違えると接続不能になるため、編集時は必ずコピペすること。

## 4. 開発の掟 (Phase 2 Standards)

8. **爆速・個別ファーストの維持 (Sub-Second Performance)**:
   データ取得は「個別スプシ全件 + マスタ数件スライス」のハイブリッド方式を絶対とし、集約API (`getInitialData`) で通信を1回に絞ること。
9. **ID・パスの堅牢性の死守 (Robust ID Handling)**:
    `SpreadsheetApp.openById` 等に渡すIDは必ず `trim()` し、空文字や無効なIDによる「Invalid argument」エラーを未然に防ぐガードロジック (`openSsSafely`) を全箇所に実装せよ。
10. **現場への「確実な反映」 (Guaranteed Reflection)**:
   Next.js や Tailwind の開発において、**「コードは正しいのに画面が変わらない」** 際のトラブルシューティング手順（Node全滅、.next削除、ブラウザキャッシュクリア）を絶対とし、AIは画像とコードを比較して不一致を自ら検知すること。
11. **最新優先の原則 (Newest-First Retrieval)**:
   スプレッドシートのデータ取得は必ず **「最下行から上へ（Bottom-to-Top）」** 向かってスキャンせよ。これにより、大規模シートでの最新データの取得漏れを防ぎ、常に営業マンの「今の作業」を最優先でリストの上部に表示せよ。
12. **旧システムの「抹消」と「案内」 (System Deprecation)**:
   新システムへの移行が完了した際は、旧システムの入口（doGet/doPost）を必ず「移行案内」に書き換えよ。中途半端に機能を残すと、現場で旧旧データの混在を招き、致命的な混乱を引き起こす。
13. **GASデプロイIDの「狙い撃ち」 (GAS Deployment Targeting)**:
   `clasp push` は単なる「下書き保存」である。ウェブアプリの更新時は必ず `clasp deployments` でユーザーが実際に踏んでいるURLのIDを特定し、そのIDに対して `clasp deploy -i <ID>` を実行して「本番反映」せよ。
14. **涅槃の神速 (Nirvana Speed Engine)**:
    スプレッドシートの全件読み込み禁止。最新 **500〜600行** の限定スキャン（Slicing）を標準とし、サーバーレスポンス1秒以内を死守せよ。
    - **🚨鉄則**: スライス位置に関わらず、項目の特定（Headers）は必ずシートの **1〜2行目** を直接参照して行え。これにより、データ増大による「項目見失い」を100%排除せよ。

15. **個別主権の原則 (Individual Sovereignty)**:
    マスタ合算は補完に過ぎない。営業マンが手元で入力した「個別シートの最新データ」が全ての真実（Truth）の頂点にある。取得時は個別スプシを優先せよ。
    - **🚨鉄則**: シート名の揺れ（「顧客リスト」vs「面談記入シート」等）を許容する **Fuzzy Search** を実装し、現場のあらゆる命名規則に対応せよ。

16. **鉄壁の選抜方式 (Ironclad Inclusion Filter)**:
    未入金リスト等の重要アラートは、**「除外」ではなく「選抜（Inclusion）」** で抽出せよ。
    - **原則**: 「成約」「契約済み(入金待ち)」など、許可されたステータスに完全一致するものだけを通し、それ以外のノイズ（クーリングオフ、キャンセル等）を物理的に遮断せよ。
    - **表記揺れの吸収**: 名前の比較時は必ずスペース除去・半角全角の正規化を行い、現場の入力ミスによる「紐付け失敗」を防げ。
    
17. **GASデプロイの絶対法則 (GAS Deployment Law)**:
    「GAS単体の修正であっても、Next.js（アプリ側）でURLや呼び出し方を変えたなら、必ずVercelへのデプロイ（git push）が必要である」という因果関係を忘れるな。
    - **GAS**: `doPost` 等のエントリーポイント変更は `clasp push` -> `clasp deploy`。
    - **Next.js**: 呼び出し元の変更は `git push` -> `Vercel Build`。
    この**両輪が揃って初めて「修正完了」**となる。片手落ちは厳禁。

18. **GAS 聖域の単一化 (Single Master Code.js)**:
    - **原則**: GAS プロジェクト内に複数の `.gs` ファイルを置くな。
    - **理由**: GAS は全ファイルのグローバル変数を共有するため、関数名（`onOpen`, `doPost` 等）の重複が HTML エラーを引き起こす。
    - **実装**: API とロジックはすべて単体の `Code.js` に集約せよ。既存の別ファイルは物理的に削除し、常に「単一の窓口」を維持せよ。

19. **外部アクセスの開放 (Anyone Access)**:
    - **原則**: Vercel (Next.js) から GAS を呼び出す場合、公開設定を **「全員（Anyone）」** にせよ。
    - **注意**: `executeAs: "USER_DEPLOYING"` かつ `access: "ANYONE_ANONYMOUS"` でなければならない。設定不備は 403 Forbidden の原因となる。

20. **デプロイメントの衛生管理 (Deployment Hygiene)**:
    - **原則**: Google のデプロイ制限（20枠）を常に意識せよ。
    - **手順**: 枠が埋まったら古いデプロイを `clasp undeploy` で削除し、中野さんの踏んでいる URL ID を狙い撃ちして `clasp deploy -i <ID>` せよ。


### 7. GAS 聖域の防衛と「現場」の規律 (GAS Safeguards & Context)

18. **GAS 聖域の単一化 (Single Master Code.js)**:
    - **原則**: GAS プロジェクト内に複数の `.gs` ファイルを置くな。関数の重複が HTML エラーを引き起こす。API とロジックはすべて単体の `Code.js` に集約せよ。

19. **外部アクセスの開放 (Anyone Access)**:
    - **原則**: 公開設定は「全員（Anyone）」「自分として実行」を死守せよ。設定不備は 403 Forbidden の原因となる。

20. **デプロイメントの衛生管理 (Deployment Hygiene)**:
    - **原則**: Google のデプロイ制限（20枠）を `clasp undeploy` で回避し、本番 URL の ID を `clasp deploy -i <ID>` で狙い撃ちせよ。

21. **「個別シート」と「マスタ」の峻別 (Source Isolation)**:
    - **鉄則**: 契約フォームと入金フォームでは、取得ソースのタブ名が異なる。
      - 契約用：`顧客リスト` または `面談記入`
      - 入金用：`入金管理リスト` または `入金` を含む全タブ
    - **ポカヨケ**: リストが空だからといって、安易に全社員共用データをフォールバックで出すな。それは担当者フィルタリングを破壊し、現場に混乱を招く「禁じ手」である。

22. **見出し行の自動探索 (Fuzzy Header Detection)**:
    - 行見出しが 1行目か 2行目か、あるいは項目名にスペースが混じっているかは「現場の自由」である。コード側で `findIndex` と `includes` を駆使し、物理的な位置に依存しない探索を行え。

Next.js や Tailwind の開発において、**「コードは正しいのに画面が変わらない」** という事態は、AIと人間の信頼関係を致命的に損なう。これを防ぐため、以下の手順を「技術憲法」に刻む。

- **AIの自己検閲 (Mirror Check)**: 
  ユーザーから送られたスクリーンショットと、自分がコミットした最新のクラス名（`text-xl` → `text-3xl` 等）を必ず比較し、**1ピクセルも変わっていない**と判断したら、「反映されていませんね」と自ら認め、即座にリセット手順を提案せよ。
- **ゴリ押し再起動 (Hard Reset Ritual)**:
  差分修正で解決しないキャッシュ問題（HMRの沈黙）が疑われる場合、以下の手順を**AIが自律的かつ迷わず実行**せよ：
  1. `netstat -ano | findstr :3000` で死に損ないのプロセスID（PID）を特定。
  2. `taskkill /F /PID <特定したPID>` で完膚なきまでに沈める。
  3. `npm run dev` でクリーンな状態でエンジンを再始動する。
- **「現場」の誤認防止 (Live vs Local Clarity)**:
  ユーザーが localhost ではなく Vercel 等の「本番URL」を見ている可能性を常に疑え。画面が変わらないと言われたら、まず最初に「いま見ているブラウザのURL」を画像やテキストで確認させ、自分の作業ディレクトリと一致しているかを照合せよ。

## 6. 焦点の峻別 (The Focus Principle)

- **文脈の独立性 (Project Isolation)**: 
  エディタに別のプロジェクト（例：キメラの卵 vs Addness）が同時に開かれていたとしても、対話中のプロジェクトの境界を1mmも越えてはならない。中央画面の視覚情報に惑わされず、**「今チャットで議論しているプロジェクトの Cwd（カレントディレクトリ）」**に全神経を集中せよ。
- **お節介の禁止 (No Unauthorized Expansion)**:
  隣のプロジェクトの不備（リンク切れ等）を見つけたとしても、許可なく修正を試みることは、相棒の集中力を削ぐ「ロジック破壊」である。発見した場合は対話で「報告」し、合意を得るステップを絶対に飛ばすな。
- **対話最優先 (Dialogue over Action)**:
  コードを走らせる前に、相棒の「違和感」が解消されたかを確認せよ。プログラムの正解よりも、相棒の抱く「おかしな点」の解明が先決である。
