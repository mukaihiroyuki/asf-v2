---
name: asf_iron_rules
description: ASF 2.0: 「四重の防御壁」と不具合再発をゼロにする技術憲法。
---

# ASF 2.0 Iron Rules: The Quadruple Safety Net

このドキュメントは、昨日までの「10時間の苦闘」を二度と繰り返さないために、AIエージェント（私）が遵守すべき**絶対的な設計・運用原則**である。

## 1. 四重の防御壁 (The Quadruple Safety Net)

従来の三層に加え、デバッグの迷走を防ぐ「透明性の壁」を追加した。

1. **ポカヨケ (Frontend Validation)**:
   - **原則**: ユーザーが間違える余地を UI で物理的に封じる。
   - **実装**: 入力欄の制限、動的バリデーション、クリップボード同期の自動化。

2. **温慈のボット (Forgiving API Logic)**:
   - **原則**: バックエンド（GAS）は「不完全なデータ」も受け入れ、修復して保存する。
   - **実装**: `TextFinder` による動的列特定。スライス位置に関わらず見出し行を 1-2 行目から再スキャン。

3. **確定照合 (Human-in-the-loop Verification)**:
   - **原則**: 金額等の核心データは、システムだけで完結させず「人間の目」を通す。
   - **実装**: 「照合待ち」ステータスの導入。

4. **鏡の壁 [NEW] (Error Transparency)**:
   - **原則**: APIエラーを「API実行に失敗しました」の一言で隠さない。システム内部の悲鳴（エラー文）をそのまま正直に画面に晒す。
   - **実装**: GAS側の `catch` ブロックで例外を文字列として返し、React上のトーストやダイアログにそのまま表示する。

---

## 2. 命綱：不具合再発防止プロトコル (Critical Lifeboat Protocols)

昨日の10時間の原因となった 5つの罠への対策。

### A. 幽霊知らずの原則 (Version Integrity)
- **掟**: AIが修正したコードが、今スマホで見ているアプリの裏で「本当に動いているか」を疑え。
- **実装**: `getInitialData` の応答に必ず `systemVersion` (例: v2024.0124.0600) を含める。画面に出てくるバージョンが自分の作業した日付・時刻と一致しないなら、それは「修正された後のコード」ではない。

### B. 封筒（Params）の解体新書 (JSON Nesting Standards)
- **掟**: フロントエンド (Vercel) はデータを `params` オブジェクトに包んで送る。
- **実装**: GAS側の `doPost` では、必ず最初に `const p = json.params || {};` と封筒を解体してから中身 (spreadsheetId等) にアクセスせよ。直撃アクセス (`json.spreadsheetId`) は undefined エラーの元である。

### C. 倉庫の限界（Cache Size）への配慮 (Robust Handling)
- **掟**: データ取得が成功しても、キャッシュ保存 (`CacheService`) でコケることがある。
- **実装**: `cache.put` は必ず `try-catch` で囲め。キャッシュ保存の失敗（Argument too large）で、データ取得の成功を台無しにしてはならない。

### D. 空行スルーの鉄則 (Trailing Empty Rows)
- **掟**: スプシの末尾にある「見えない空行」を実データとして読み取ってはならない。
- **実装**: `lastRow` 依存のレンジ取得をやめ、`getDataRange().getValues()` で「実際にデータが入っている全範囲」を取得せよ。

### E. デプロイURLの不動化 (Manual Deploy Priority)
- **掟**: `clasp push` は下書き保存に過ぎない上、権限を勝手にリセットすることがある。
- **実装**: 最終的なデプロイは必ず GAS 画面上の **「デプロイを管理」 > 「新しいバージョン」** で行い、URL権限が「全員(Anyone)」であることを自ら確認せよ。

### F. 鉄壁の選抜・除外の掟 (Business Logic Safeguards) [NEW]
- **掟**: 「未入金リスト」は単なる数字の計算ではない。営業現場の「信義」を反映せよ。
- **実装**: 
    - **除外対象**: 「クーリングオフ」「入金前解除」「却下」「キャンセル」「入金前解約」のステータスを持つ顧客は、未入金があってもリストに表示してはならない（ノイズ除去）。
    - **広角スキャンの掟**: スプシの見出し（結果、ステータス、判定など）は、時に AU 列のような遠い場所にある。`getCustomerList` や `getOverduePaymentList` では、必ず 100 列以上の広範な範囲をスキャンし、情報の見落とし（節穴）を防げ。
    - **情報の統合（Enrichment）**: 同一 ID が複数タブ（面談計入と顧客リストなど）に存在する場合、ステータスが「空欄」の行に惑わされるな。Map等を用い、いずれかの行に確定したビジネス結果（結果列の値）が存在するなら、それを全行程で優先採用せよ。
    - **並び順**: 常に「最新の案件（放置期間が短いもの）」が最上部に来るように昇順（1日→10日...）にソートせよ。
    - **金額の解釈**: カンマ文字（,）を含む金額文字列も正しく数値変換 (`parsePrice`) し、1円のズレも許さず判定せよ。


---

## 3. システム識別子 (Ground Truth)

- **Master DB (全面談合算)**: `1xnN8CSq-9DyyhwJZayHkoJKBkcR9nGRZEsSr_r6SLfg`
- **Auth Master (認証マスタ)**: `1bKiuaQQOBijQSVU9oLtvxgoYE2Xb_9klwWaJ5YLs4UQ`
- **GAS Web App URL**: `https://script.google.com/macros/s/AKfycbw9QfWOtUfvmZzVl2FOobqoUlAv8KFr36AAhTEFCXNqa49mKG3fzmEfkFGQG4PT67zC/exec` (Manual v138+)
- **🚨警告**: これ以外の URL を Vercel にセットしてはならない。

---

## 4. 開発の行動規範 (Behavioral Standards)

1. **爆速の維持 (Sub-Second Response)**: 
   全件読み込みによる 1 秒超えは禁止。`getDataRange` は使いつつも、ループ内での API 叩き（`getSheetByName` 等）を最小化せよ。

2. **Atomic Design & Separation**:
   2013行のモノリスは死罪。UI、ロジック、API クライアントを明確に分離し、React キャッシュ等による「画面が変わらない」問題に対しては `taskkill` によるハードリセットを自律的に行え。

3. **現場最優先 (Live Environment First)**:
   ローカルで動いているからといって「直りました」と言うな。Vercel に `git push` し、デプロイが完了したことを確認してから、ユーザーに「リロード」を促せ。

---

## 5. 焦点の峻別 (The Focus Principle)

- **文脈の独立性 (Project Isolation)**: キメラの卵と Addness 等、別プロジェクトを混同するな。カレントディレクトリが全てである。
- **対話最優先 (Dialogue over Action)**: コードを走らせる前に、相棒の「違和感（ヒント）」を聞け。そこには、技術的な答えよりも早く正解に辿り着く「直感」が隠されている。
