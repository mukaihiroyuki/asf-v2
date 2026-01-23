// ========================================
// ASF 2.0 Global Settings
// ========================================

// 1. スプレッドシートID (全情報を1つのマスタへ集約！)
const DATA_MASTER_SPREADSHEET_ID = '1xnN8CSq-9DyyhwJZayHkoJKBkcR9nGRZEsSr_r6SLfg'; // 合算マスタ (全情報の核)
const AUTH_MASTER_SPREADSHEET_ID = DATA_MASTER_SPREADSHEET_ID; // 認証情報もここに統合だぜ相棒！

// 2. シート名
const SHEET_ALL_INTERVIEWS = '全面談合算';
const SHEET_ALL_PAYMENTS = '全入金合算';
const SHEET_CUSTOMER_LIST = '顧客リスト';
const SHEET_PAYMENT_LIST = '入金管理リスト';
const SHEET_DROPDOWN = 'プルダウン';
const SHEET_MASTER_DROPDOWN = 'master_dropdown'; // ← 新設マスタ！
const SHEET_PLAN_MASTER = 'plan_master';
const AUTH_MASTER_SHEET_NAME = '面談シート一覧';

/**
 * IDチェック付きで安全にスプレッドシートを開くヘルパー
 */
function openSsSafely(id, label) {
  const cleanId = id ? String(id).trim() : '';
  if (!cleanId) {
    throw new Error(`${label || 'スプレッドシート'}のIDが空だぜ。マスタの設定を確認してくれ！`);
  }
  try {
    return SpreadsheetApp.openById(cleanId);
  } catch (e) {
    console.error(`[CRITICAL ERROR] ${label} (ID: ${cleanId}) を開けませんでした。エラー詳細: ${e.toString()}`);
    throw new Error(`${label || 'スプレッドシート'} (ID: ${cleanId}) を開けなかったぜ。権限かIDが間違ってる可能性があるな。`);
  }
}

/**
 * 列インデックスを柔軟に探すヘルパー
 * 複数の候補名から最初に見つかった列番号を返すぜ！
 */
function findColIndex(headers, possibleNames) {
  if (!headers) return -1;
  for (const name of possibleNames) {
    const idx = headers.indexOf(name);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * シート名をあいまい検索するヘルパー
 * 「顧客リスト」を渡すと、「2 顧客リスト」とかも探すぜ！
 */
function getSheetFuzzy(ss, sheetName) {
  const sheets = ss.getSheets();
  // 1. 完全一致
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  // 2. 部分一致（後ろの方に含まれているか、接頭辞があるか）
  for (const s of sheets) {
    const sName = s.getName();
    if (sName.includes(sheetName)) return s;
  }
  return null;
}

/**
 * シートからヘッダーとデータを柔軟に取得するヘルパー
 * 1行目または2行目に「面談ID」がある方を選択するぜ！
 */
function getHeadersAndData(sheet) {
  if (!sheet) return { headers: [], dataStartRow: 0, colId: -1 };
  const allValues = sheet.getRange(1, 1, Math.min(sheet.getLastRow(), 100), sheet.getLastColumn()).getValues();
  if (allValues.length === 0) return { headers: [], dataStartRow: 0, colId: -1 };

  // 1行目か2行目から「面談ID」を探す
  let headers = allValues[0];
  let dataStartRow = 1;
  let colId = headers.indexOf('面談ID');

  if (colId === -1 && allValues[1]) {
    headers = allValues[1];
    dataStartRow = 2;
    colId = headers.indexOf('面談ID');
  }

  return { headers, dataStartRow, colId };
}

/**
 * ASF 2.0 Stateless API Dispatcher (Optimized)
 * Next.js からの fetch(POST) を受け取り、爆速で振り分けるぜ！
 */
function doPost(e) {
  try {
    const jsonString = e.postData.contents;
    const request = JSON.parse(jsonString);
    const action = request.action;
    const params = request.params || {};

    let result;
    const ss = params.spreadsheetId ? openSsSafely(params.spreadsheetId, '個別シート') : null;

    switch (action) {
      case 'authenticateByPIN':
        result = authenticateByPIN(params.pin);
        break;
      case 'getInitialData':
        result = getInitialData(params.spreadsheetId, ss);
        break;
      case 'getCustomerList':
        result = getCustomerList(params.spreadsheetId, null, ss);
        break;
      case 'getPaymentCustomerList':
        result = getPaymentCustomerList(params.spreadsheetId, ss);
        break;
      case 'getOverduePaymentList':
        result = getOverduePaymentList(params.spreadsheetId, ss);
        break;
      case 'getPaymentMethods':
        result = getPaymentMethods(params.spreadsheetId, ss);
        break;
      case 'getPaymentMethodsH':
        result = getPaymentMethodsH(params.spreadsheetId, ss);
        break;
      case 'getPlanList':
        result = getPlanList();
        break;
      case 'submitReport':
        result = submitReport(params.formData);
        break;
      case 'submitPayment':
        result = submitPayment(params.formData);
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('API Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "【ASF 2.0 API】" + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * CORS対応用
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 旧アプリUI封鎖（Webアプリとして踏んだ場合は案内を出す...のはやめて、APIとして専念する！）
 */
function doGet() {
  return HtmlService.createHtmlOutput("ASF 2.0 API is Running.");
}

/**
 * シートIDから営業担当者名を逆引きするヘルパー (SS再利用最適化)
 */
function getStaffNameBySheetId(targetSheetId, providedSs) {
  const cacheKey = 'staff_name_v4_' + targetSheetId;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const ss = providedSs || openSsSafely(AUTH_MASTER_SPREADSHEET_ID, '認証マスタ');
    const sheet = ss.getSheetByName(AUTH_MASTER_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const urlInB = String(row[1]);
      const idInC = String(row[2]);

      let rowId = idInC.trim();
      if (!rowId && urlInB.includes('/d/')) {
        rowId = urlInB.split('/d/')[1].split('/')[0];
      }

      if (rowId && String(rowId).trim() === String(targetSheetId).trim()) {
        const staffName = row[0];
        cache.put(cacheKey, staffName, 21600);
        return staffName;
      }
    }
  } catch (e) {
    console.error('getStaffNameBySheetId Error: ' + e.toString());
  }
  return null;
}

/**
 * 初期表示に必要な全データを一括取得するバルクローダー
 * ★パフォーマンス最適化：スプシオープン回数を最小化
 */
function getInitialData(spreadsheetId) {
  const ss = openSsSafely(spreadsheetId, '個別シート');
  const staffName = getStaffNameBySheetId(spreadsheetId, ss);

  // マスタドロップダウンを一括取得（爆速キャッシュ対応）
  const masters = getMasterDropdowns();

  return {
    customerList: getCustomerList(spreadsheetId, staffName, ss),
    paymentCustomerList: getPaymentCustomerList(spreadsheetId, ss),
    planList: getPlanList(),
    paymentMethods: masters.paymentMethods,  // マスタ（B列）から取得
    paymentMethodsH: masters.paymentGrouping, // A列は予備へ
    staffName: staffName
  };
}

/**
 * マスタスプレッドシートから全ドロップダウンリストを一括取得 (キャッシュ24時間)
 */
function getMasterDropdowns() {
  const cacheKey = 'master_dropdowns_v2'; // キャッシュを強制更新！
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { }
  }

  try {
    const ss = openSsSafely(DATA_MASTER_SPREADSHEET_ID, '合算マスタ');
    const sheet = ss.getSheetByName(SHEET_MASTER_DROPDOWN);
    if (!sheet) throw new Error('master_dropdownシートが見つかりません');

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // A列: 結果, B列: 支払い方法, C列: 決済方法
    const results = [];
    const paymentGrouping = [];
    const paymentMethods = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) results.push(String(data[i][0]).trim());
      if (data[i][1]) paymentGrouping.push(String(data[i][1]).trim());
      if (data[i][2]) paymentMethods.push(String(data[i][2]).trim());
    }

    const result = {
      results,
      paymentGrouping,
      paymentMethods
    };

    cache.put(cacheKey, JSON.stringify(result), 86400); // 24時間キャッシュ
    return result;

  } catch (e) {
    console.error('getMasterDropdowns Error: ' + e.toString());
    return { results: [], paymentGrouping: [], paymentMethods: [] };
  }
}

/**
 * 個別シート優先＆マスタ後方スライスによる爆速顧客リスト取得
 */
function getCustomerList(spreadsheetId, providedStaffName, providedSs) {
  const ss = providedSs || openSsSafely(spreadsheetId, '個別シート');
  const staffName = providedStaffName || getStaffNameBySheetId(spreadsheetId, ss);

  // 0. キャッシュチェック
  const cacheKey = 'customer_list_v5_' + spreadsheetId; // バージョンUPしてキャッシュを強制更新だ！

  const cache = CacheService.getUserCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { }
  }

  const customers = [];
  const processedIds = new Set();

  // 1. 個別シートを全件取得（ただし範囲を限定）
  try {
    const targetSheets = [
      getSheetFuzzy(ss, SHEET_CUSTOMER_LIST),
      getSheetFuzzy(ss, '面談記入'),
      getSheetFuzzy(ss, SHEET_PAYMENT_LIST)
    ].filter(s => s !== null);

    for (const s of targetSheets) {
      const lastRow = s.getLastRow();
      if (lastRow <= 1) continue;

      // 最新500行に限定（全件読み込み回避）
      const fetchCount = 500;
      const startRow = Math.max(1, lastRow - fetchCount + 1);
      const sData = s.getRange(startRow, 1, Math.min(fetchCount, lastRow), s.getLastColumn()).getValues();

      // --- ヘッダー特定ロジックを強化 (2段ヘッダー対応) ---
      // スライス位置に関わらず、常に1〜2行目を「ヘッダー」として見に行くぜ！
      const headerRows = s.getRange(1, 1, 2, s.getLastColumn()).getValues();
      let sHeaders = headerRows[0];
      let dataStartRowRelativeToSlice = (startRow === 1) ? 1 : 0;
      let sColId = findColIndex(sHeaders, ['面談ID', 'interview_id', 'ID']);

      // 1行目に「面談ID」がない場合、2行目もチェック
      if (sColId === -1 && headerRows[1]) {
        sHeaders = headerRows[1];
        dataStartRowRelativeToSlice = (startRow <= 2) ? 2 - startRow + 1 : 0;
        sColId = findColIndex(sHeaders, ['面談ID', 'interview_id', 'ID']);
      }

      // --- マスター（全面談合算）が2段ヘッダーだった場合の念押し対応 ---
      // ※現状は1行目固定だが見つからない場合は2行目も見るぜ
      if (sColId === -1 && sData.length > 2) {
        sHeaders = sData[0]; // スライス内にヘッダーが含まれる場合
        sColId = findColIndex(sHeaders, ['面談ID', 'interview_id', 'ID']);
      }
      // --------------------------------------------------

      const sColName = findColIndex(sHeaders, ['LINE名', '名前', '氏名', '顧客名', '契約名義']);
      const sColStatus = findColIndex(sHeaders, ['結果', 'ステータス', 'status']);
      const sColDate = findColIndex(sHeaders, ['面談日', '日付', 'date']);

      const targetCol = sColId !== -1 ? sColId : 0;
      const currentGid = s.getSheetId();

      for (let j = sData.length - 1; j >= dataStartRowRelativeToSlice; j--) {
        const row = sData[j];
        const valId = row[targetCol];
        if (valId && String(valId).trim() !== '' && !processedIds.has(String(valId).trim())) {
          const id = String(valId).trim();
          const nameVal = sColName !== -1 ? row[sColName] : '';
          const statusVal = sColStatus !== -1 ? String(row[sColStatus]) : '';
          const dateVal = sColDate !== -1 && row[sColDate] instanceof Date
            ? Utilities.formatDate(row[sColDate], 'Asia/Tokyo', 'yyyy/MM/dd')
            : '';

          customers.push({
            id: id,
            name: nameVal ? String(nameVal).trim() : '(名前なし)',
            link: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${currentGid}&range=${startRow + j}:${startRow + j}`,
            status: statusVal,
            date: dateVal,
            source: 'individual'
          });
          processedIds.add(id);
        }
      }
    }

  } catch (e) {
    console.error('Individual Sheet Error: ' + e.toString());
  }

  // 2. 合算マスタの最新300行をスキャ
  try {
    const masterSs = openSsSafely(DATA_MASTER_SPREADSHEET_ID, '合算マスタ');
    const interviewSheet = masterSs.getSheetByName(SHEET_ALL_INTERVIEWS);
    if (!interviewSheet) throw new Error('Master sheet not found: ' + SHEET_ALL_INTERVIEWS);
    const lastRow = interviewSheet.getLastRow();

    if (lastRow > 1) {
      const fetchCount = 310; // 余裕を持って310行
      const startRow = Math.max(1, lastRow - fetchCount + 1);
      const range = interviewSheet.getRange(startRow, 1, Math.min(fetchCount, lastRow), interviewSheet.getLastColumn());
      const interviewData = range.getValues();

      // 合算マスタのヘッダー特定 (2段ヘッダー対応)
      const masterHeadersRows = interviewSheet.getRange(1, 1, 2, interviewSheet.getLastColumn()).getValues();
      let headers = masterHeadersRows[0];
      let dataOffset = (startRow === 1) ? 1 : 0;
      let colId = findColIndex(headers, ['面談ID', 'interview_id', 'ID']);

      if (colId === -1 && masterHeadersRows[1]) {
        headers = masterHeadersRows[1];
        dataOffset = (startRow <= 2) ? 2 - startRow + 1 : 0;
        colId = findColIndex(headers, ['面談ID', 'interview_id', 'ID']);
      }

      const colName = findColIndex(headers, ['LINE名', '名前', '氏名', '顧客名']);
      const colStaff = findColIndex(headers, ['営業担当', '担当者', 'sales_staff', '担当']);
      const colStatus = findColIndex(headers, ['結果', 'ステータス', 'status']);
      const colDate = findColIndex(headers, ['面談日', '日付', 'date']);

      for (let i = interviewData.length - 1; i >= dataOffset; i--) {
        const row = interviewData[i];
        const valId = row[colId];
        if (!valId || String(valId).trim() === '' || processedIds.has(String(valId).trim())) continue;

        const interviewId = String(valId).trim();
        if (staffName && colStaff !== -1) {
          // 姓名の間のスペースの有無や全角/半角の揺れを許容するぜ！
          const normalizedRowStaff = String(row[colStaff]).normalize('NFKC').replace(/\s/g, '');
          const normalizedStaffParam = String(staffName).normalize('NFKC').replace(/\s/g, '');
          if (normalizedRowStaff !== normalizedStaffParam) continue;
        }

        const nameVal = colName !== -1 ? row[colName] : '';
        customers.push({
          id: interviewId,
          name: nameVal ? String(nameVal).trim() : '(名前なし)',
          link: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          status: colStatus !== -1 ? String(row[colStatus]) : '',
          date: colDate !== -1 && row[colDate] instanceof Date
            ? Utilities.formatDate(row[colDate], 'Asia/Tokyo', 'yyyy/MM/dd')
            : '',
          source: 'master_slice'
        });
        processedIds.add(interviewId);
      }
    }
  } catch (e) {
    console.error('Master Slice Error: ' + e.toString());
  }

  const result = customers;
  try { cache.put(cacheKey, JSON.stringify(result), 180); } catch (e) { } // 15分→3分(180秒)に短縮！
  return result;
}

function getPaymentCustomerList(spreadsheetId, providedSs) {
  const ss = providedSs || openSsSafely(spreadsheetId, '個別シート');
  const sheet = getSheetFuzzy(ss, SHEET_PAYMENT_LIST);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  // 入金報告用も最新500行に限定
  const fetchCount = 500;
  const startRow = Math.max(1, lastRow - fetchCount + 1);
  const data = sheet.getRange(startRow, 1, Math.min(fetchCount, lastRow), sheet.getLastColumn()).getValues();

  // --- ヘッダー特定ロジックを強化 (2段ヘッダー対応) ---
  const headerRows = sheet.getRange(1, 1, 2, sheet.getLastColumn()).getValues();
  let headers = headerRows[0].map(String);
  let headers2 = headerRows[1] ? headerRows[1].map(String) : [];

  let colId = findColIndex(headers, ['面談ID', 'ID']);
  if (colId === -1) colId = findColIndex(headers2, ['面談ID', 'ID']);

  let colName = findColIndex(headers, ['契約名義', '名前', '顧客名']);
  if (colName === -1) colName = findColIndex(headers2, ['契約名義', '名前', '顧客名']);

  if (colId === -1 || colName === -1) {
    console.warn(`[getPaymentCustomerList] 必要な列が見つかりません。 colId:${colId}, colName:${colName}`);
    return [];
  }

  const customers = [];
  const processedIds = new Set();
  const loopStartRowRelativeToSlice = (startRow <= 2) ? 2 - startRow + 1 : 0; // データ開始行（3行目以降）を適切に計算


  // 最新優先（下から上へ）
  for (let i = data.length - 1; i >= loopStartRowRelativeToSlice; i--) {
    const row = data[i];
    const id = String(row[colId]).trim();
    const name = String(row[colName]).trim();

    if (id && name && !processedIds.has(id)) {
      customers.push({
        id: id,
        customerName: name,
        link: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheet.getSheetId()}&range=${startRow + i}:${startRow + i}`
      });
      processedIds.add(id);
    }
  }

  return customers;
}

function getOverduePaymentList(spreadsheetId) {
  const cacheKey = 'overdue_list_' + spreadsheetId;
  const cache = CacheService.getUserCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { }
  }

  const ss = openSsSafely(spreadsheetId, '個別シート');
  const paymentSheet = ss.getSheetByName(SHEET_PAYMENT_LIST);
  const paymentData = paymentSheet.getDataRange().getValues();
  if (paymentData.length <= 1) return [];

  // マスターから最新ステータスを取得（スライス利用）
  const staffName = getStaffNameBySheetId(spreadsheetId);
  const customerListRecent = getCustomerList(spreadsheetId, staffName);
  const statusMap = {};
  customerListRecent.forEach(c => { statusMap[c.id] = c.status; });

  const INCLUDED_STATUSES = ['成約', '契約済み(入金待ち)'];
  const today = new Date();
  const OVERDUE_DAYS = 0; // 0日に設定して即座にアラートだぜ！
  const overdueList = [];

  for (let i = paymentData.length - 1; i >= 1; i--) {
    const row = paymentData[i];
    const interviewId = String(row[0]).trim();
    if (!interviewId) continue;

    const customerName = String(row[1] || '').trim(); // B列: 名前
    const contractDate = row[4];
    const salesAmount = Number(row[9]) || 0;
    const paidAmount = Number(row[10]) || 0;

    if (!contractDate || salesAmount <= 0) continue;
    if (salesAmount <= paidAmount) continue; // 完済済みはスキップ

    const currentStatus = (statusMap[interviewId] || '').trim();
    // 指定されたステータス以外は無視（選抜方式）
    if (!INCLUDED_STATUSES.includes(currentStatus)) continue;

    const contractDateObj = new Date(contractDate);
    const diffDays = Math.floor((today - contractDateObj) / (1000 * 60 * 60 * 24));

    if (diffDays >= OVERDUE_DAYS) {
      overdueList.push({
        id: interviewId,
        customerName: customerName || '(名前なし)',
        contractDate: Utilities.formatDate(contractDateObj, 'Asia/Tokyo', 'yyyy/MM/dd'),
        overdueDays: diffDays
      });
    }
  }

  // 経過日数が少ない順にソート
  overdueList.sort((a, b) => a.overdueDays - b.overdueDays);

  return overdueList;
}

function getPaymentMethods(spreadsheetId, providedSs) {
  return getMasterDropdowns().paymentGrouping;
}

/**
 * plan_masterからアクティブなプランリストを取得
 * ★共通マスタ：認証マスタのスプシから読み込み
 */
function getPlanList() {
  // キャッシュ
  const cacheKey = 'plan_list';
  const cache = CacheService.getScriptCache(); // 全体共通なのでScriptCache
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { }
  }

  const ss = openSsSafely(AUTH_MASTER_SPREADSHEET_ID, '認証マスタ');
  const sheet = ss.getSheetByName(SHEET_PLAN_MASTER);
  const data = sheet.getDataRange().getValues();

  const plans = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const planId = row[0];       // A列: plan_id
    const planName = row[1];     // B列: plan_name
    const priceGeneral = row[2]; // C列: price_general
    const priceBank = row[3];    // D列: price_bank
    const isActive = row[5];     // F列: is_active
    const isInstallment = row[6]; // G列: is_installment

    // is_activeがTRUEのもののみ取得
    if (isActive === true || isActive === 'TRUE') {
      plans.push({
        id: planId,
        name: planName,
        priceGeneral: priceGeneral,
        priceBank: priceBank,
        isInstallment: isInstallment === true || isInstallment === 'TRUE'
      });
    }
  }

  const result = plans;
  try {
    cache.put(cacheKey, JSON.stringify(result), 1800); // 30分
  } catch (e) { }
  return result;
}

/**
 * 営業報告を送信（入金管理リストに行を追加 or 上書き）
 * ★同じ面談IDが既に存在する場合は上書き（UPSERT）
 * ★入金データ（M列以降）には一切触れない
 * @param {Object} formData - formData.spreadsheetId を含む
 */
function submitReport(formData) {
  try {
    const ss = openSsSafely(formData.spreadsheetId, '個別シート');
    const sheet = ss.getSheetByName(SHEET_PAYMENT_LIST);

    console.log('Form data: ' + JSON.stringify(formData));

    // ★面談IDで既存の行を検索（UPSERT対応）
    const finder = sheet.getRange('A:A').createTextFinder(formData.interviewId).matchEntireCell(true);
    const foundRange = finder.findNext();

    let targetRow;
    let isUpdate = false;

    if (foundRange) {
      // 既存の行が見つかった → 上書きモード
      targetRow = foundRange.getRow();
      isUpdate = true;
      console.log('Found existing row: ' + targetRow + ' (UPDATE mode)');
    } else {
      // 見つからなかった → 新規追加モード
      const lastRow = sheet.getRange(sheet.getMaxRows(), 1).getNextDataCell(SpreadsheetApp.Direction.UP).getRow();
      targetRow = lastRow + 1;
      console.log('Creating new row: ' + targetRow + ' (INSERT mode)');
    }

    // ★保護列をスキップして書き込み
    // G,H,I列（7,8,9列）とK,L列（11,12列）は保護されているのでノータッチ
    // M列以降（入金データ）も絶対に触らない

    // A〜F列（1〜6列）のデータ
    const rowDataAtoF = [
      formData.interviewId,           // A列: 面談ID
      formData.contractName,          // B列: 名前（契約名義）
      formData.onboarding ? '◯' : '', // C列: オンボーディング完了
      formData.paymentMethod,         // D列: 決済方法
      formData.contractDate,          // E列: 契約締結日
      ''                              // F列: 入金完了日
    ];

    // A〜F列を書き込み（6列）
    sheet.getRange(targetRow, 1, 1, 6).setValues([rowDataAtoF]);

    // J列（10列目）のみ別途書き込み
    sheet.getRange(targetRow, 10).setValue(formData.salesAmount);

    // 備考がある場合はB列（顧客名）にノートを追加
    if (formData.notes && formData.notes.trim() !== '') {
      sheet.getRange(targetRow, 2).setNote(formData.notes.trim());
    }

    const message = isUpdate ? '報告を更新しました！' : '報告が完了しました！';

    // ★キャッシュ破棄（送信後は最新データを見せたいぜ！）
    try {
      const cache = CacheService.getUserCache();
      cache.remove('customer_list_v5_' + formData.spreadsheetId);
      cache.remove('overdue_list_' + formData.spreadsheetId);
      console.log('Caches cleared for: ' + formData.spreadsheetId);
    } catch (e) { }

    return { success: true, message: message };

  } catch (error) {
    console.error('Error: ' + error.toString());
    return { success: false, message: 'エラー: ' + error.toString() };
  }
}


function getPaymentMethodsH(spreadsheetId, providedSs) {
  return getMasterDropdowns().paymentMethods;
}

/**
 * 入金報告を送信（入金管理リストに決済情報を追加）
 * @param {Object} formData - formData.spreadsheetId を含む
 */
function submitPayment(formData) {
  try {
    const ss = openSsSafely(formData.spreadsheetId, '個別シート');
    const sheet = ss.getSheetByName(SHEET_PAYMENT_LIST);

    console.log('Payment data: ' + JSON.stringify(formData));

    // 対象の顧客の行を高速検索（TextFinderを使用）
    const finder = sheet.getRange('A:A').createTextFinder(formData.customerId).matchEntireCell(true);
    const foundRange = finder.findNext();

    if (!foundRange) {
      return { success: false, message: '顧客が見つかりません: ' + formData.customerId };
    }

    const targetRow = foundRange.getRow();

    console.log('Found customer at row: ' + targetRow);

    // 決済スロットを探す（M,N,O / Q,R,S / U,V,W ...）
    // M列 = 13, 4列サイクル（決済日、金額、方法、チェック）
    const startCol = 13; // M列
    const cycleSize = 4;
    const maxCycles = 12; // 最大12回

    let slotFound = false;
    let writeCol = -1;

    for (let cycle = 0; cycle < maxCycles; cycle++) {
      const dateCol = startCol + (cycle * cycleSize);
      const cellValue = sheet.getRange(targetRow, dateCol).getValue();

      if (!cellValue || cellValue === '') {
        // 空のスロット発見
        writeCol = dateCol;
        slotFound = true;
        break;
      }
    }

    if (!slotFound) {
      return { success: false, message: '決済スロットがいっぱいです（最大12回）' };
    }

    console.log('Writing to columns starting at: ' + writeCol);

    // 決済日、金額、方法を書き込み（チェック列はスキップ）
    const paymentData = [
      formData.paymentDate,
      formData.paymentAmount,
      formData.paymentMethod
    ];

    sheet.getRange(targetRow, writeCol, 1, 3).setValues([paymentData]);

    // ★キャッシュ破棄
    try {
      const cache = CacheService.getUserCache();
      cache.remove('overdue_list_' + formData.spreadsheetId);
    } catch (e) { }

    return { success: true, message: '入金報告が完了しました！' };

  } catch (error) {
    console.error('Error: ' + error.toString());
    return { success: false, message: 'エラー: ' + error.toString() };
  }
}

// ========================================
// PIN認証マスタ関連
// ========================================

// 認証マスタ関連

/**
 * D列に重複のない4桁PINを自動生成
 * GASエディタから手動で1回実行する用
 */
function generatePINs() {
  const ss = openSsSafely(AUTH_MASTER_SPREADSHEET_ID, '認証マスタ');
  const sheet = ss.getSheetByName(AUTH_MASTER_SHEET_NAME);
  const lastRow = sheet.getLastRow();

  const usedPINs = new Set();
  let generatedCount = 0;

  for (let row = 2; row <= lastRow; row++) {
    // 既にPINがある場合はスキップ
    const existingPIN = sheet.getRange(row, 5).getValue();
    if (existingPIN && existingPIN !== '') {
      usedPINs.add(String(existingPIN));
      continue;
    }

    // 営業担当者名がない行はスキップ
    const staffName = sheet.getRange(row, 1).getValue();
    if (!staffName || staffName === '' || staffName === '営業担当者') {
      continue;
    }

    // 重複しない4桁PINを生成
    let pin;
    do {
      pin = String(Math.floor(1000 + Math.random() * 9000)); // 1000-9999
    } while (usedPINs.has(pin));

    usedPINs.add(pin);
    sheet.getRange(row, 5).setValue(pin);
    generatedCount++;
  }

  Logger.log('PIN生成完了: ' + generatedCount + '件');
  SpreadsheetApp.getUi().alert('PIN生成完了: ' + generatedCount + '件');
}

/**
 * PINで営業マン名とスプシIDを検索
 * @param {string} pin - 4桁のPIN
 * @returns {Object} - { success, staffName, spreadsheetId, message }
 */
function authenticateByPIN(pin) {
  try {
    const ss = openSsSafely(AUTH_MASTER_SPREADSHEET_ID, '認証マスタ');
    const sheet = ss.getSheetByName(AUTH_MASTER_SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const staffName = row[0];      // A列: 営業担当者
      const urlInB = String(row[1]); // B列: URL
      const idInC = String(row[2]);  // C列: シートID
      const storedPIN = String(row[4]); // E列にPINがあるぜ相棒！ (index 4)

      if (storedPIN && storedPIN === String(pin)) {
        // IDが空ならURLから抽出
        let spreadsheetId = idInC.trim();
        if (!spreadsheetId && urlInB.includes('/d/')) {
          spreadsheetId = urlInB.split('/d/')[1].split('/')[0];
        }

        return {
          success: true,
          staffName: staffName,
          spreadsheetId: spreadsheetId,
          message: 'ログイン成功'
        };
      }
    }

    return {
      success: false,
      staffName: '',
      spreadsheetId: '',
      message: 'PINが見つかりません'
    };
  } catch (error) {
    console.error('認証エラー: ' + error.toString());
    return {
      success: false,
      staffName: '',
      spreadsheetId: '',
      message: 'エラー: ' + error.toString()
    };
  }
}
