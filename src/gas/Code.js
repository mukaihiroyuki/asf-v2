// ========================================
// ASF 2.0 Global Settings
// ========================================

/** GLOBAL LOG FOR DEBUGGING */
function log(msg) { console.log(msg); }

function cleanStr(s) {
  return String(s || '').trim().replace(/\s+/g, '').toLowerCase();
}

function isMatchFuzzy(val, list) {
  const target = cleanStr(val);
  return list.some(item => cleanStr(item) === target);
}


const DATA_MASTER_SPREADSHEET_ID = '1xnN8CSq-9DyyhwJZayHkoJKBkcR9nGRZEsSr_r6SLfg';
const AUTH_MASTER_SPREADSHEET_ID = DATA_MASTER_SPREADSHEET_ID;

const SHEET_ALL_INTERVIEWS = '\u5168\u9762\u8ac7\u5408\u7b97';
const SHEET_ALL_PAYMENTS = '\u5168\u5165\u91d1\u5408\u7b97';
const SHEET_CUSTOMER_LIST = '\u9867\u5ba2\u30ea\u30b9\u30c8';
const SHEET_PAYMENT_LIST = '\u5165\u91d1\u7ba1\u7406\u30ea\u30b9\u30c8';
const SHEET_DROPDOWN = '\u30d7\u30eb\u30c0\u30a6\u30f3';
const SHEET_MASTER_DROPDOWN = 'master_dropdown';
const SHEET_PLAN_MASTER = 'plan_master';
const AUTH_MASTER_SHEET_NAME = '\u9762\u8ac7\u30b7\u30fc\u30c8\u4e00\u89a7';

function openSsSafely(id, label) {
  const cleanId = id ? String(id).trim() : '';
  if (!cleanId) throw new Error(`${label || '\u30b9\u30d7\u30ec\u30c3\u30c9\u30b7\u30fc\u30c8'}\u306eID\u304c\u7a7a\u3060\u305c\u3002`);
  try { return SpreadsheetApp.openById(cleanId); } catch (e) { throw new Error(`${label} (ID: ${cleanId}) \u3092\u958b\u3051\u306a\u304b\u3063\u305f\u305c\u3002`); }
}

function findColIndex(headers, possibleNames) {
  if (!headers) return -1;
  const h = headers.map(v => String(v || '').trim());
  for (const name of possibleNames) {
    const idx = h.indexOf(name);
    if (idx !== -1) return idx;
    for (let i = 0; i < h.length; i++) {
      if (h[i].includes(name)) return i;
    }
  }
  return -1;
}

function parsePrice(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[\\,¥]/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

// FIX: Added missing helper function
function getSheetFuzzy(ss, name) {
  if (!ss) return null;
  const direct = ss.getSheetByName(name);
  if (direct) return direct;
  const sheets = ss.getSheets();
  for (const s of sheets) {
    if (s.getName().replace(/\s/g, '').includes(name.replace(/\s/g, ''))) return s;
  }
  return null;
}

/**
 * 【決定版】個別シート（顧客リスト）からデータを確実に吸い上げるぜ相棒！
 * Debug v503: Returns logs in UI if empty
 */
function getCustomerList(spreadsheetId, providedStaffName, providedSs, targetGid) {
  const debugLogs = [];
  const log = (msg) => { debugLogs.push(String(msg)); };

  log(`[Start] Staff: ${providedStaffName}`);

  const ss = providedSs || openSsSafely(spreadsheetId, '個別シート');
  let staffName = providedStaffName;
  if (!staffName) staffName = getStaffInfoBySheetId(spreadsheetId, ss).name;

  const staffSuffix = staffName || 'ALL';
  const cacheKey = `v2.6_cust_list_${spreadsheetId}_${staffSuffix}`;
  const cache = CacheService.getUserCache();

  // Cache killed for debugging
  /*
  const cached = cache.get(cacheKey);
  if (cached) { try { return JSON.parse(cached); } catch (e) { } }
  */

  const customerMap = {}; // Robust Map for status enrichment

  try {
    const primaryNames = ['\u9867\u5ba2\u30ea\u30b9\u30c8', '顧客リスト', '\u9762\u8ac7\u8a18\u5165', '面談記入'];
    let targetSheets = primaryNames.map(name => getSheetFuzzy(ss, name)).filter(s => s !== null);

    if (targetGid) {
      const gidS = ss.getSheets().find(sh => String(sh.getSheetId()) === String(targetGid));
      if (gidS && targetSheets.indexOf(gidS) === -1) targetSheets.push(gidS);
    }

    if (targetSheets.length === 0) {
      log('Warn: No named sheets found. Scanning all...');
      for (const sh of ss.getSheets()) {
        const hVal = sh.getRange(1, 1, 2, 100).getValues().map(r => r.join('')).join('');
        if (hVal.includes('\u9762\u8ac7ID')) targetSheets.push(sh);
      }
    }

    log(`Sheets: ${targetSheets.map(s => s.getName()).join(', ')}`);

    for (const s of targetSheets) {
      const lastRow = s.getLastRow();
      if (lastRow <= 1) continue;

      const allData = s.getDataRange().getValues();
      const hData = allData.slice(0, 2);
      let headers = hData[1].join('').includes('面談ID') ? hData[1] : hData[0];
      let dataStartIdx = (hData[1].join('').includes('面談ID') ? 2 : 1);

      const colId = findColIndex(headers, ['面談ID', 'ID']);
      const colId2 = findColIndex(headers, ['顧客ID', 'CID']);
      const colName = findColIndex(headers, ['LINE名', '名前', '氏名', '氏名(カナ)']);
      const colStatus = findColIndex(headers, ['結果', 'ステータス', '状態', '判定']);

      log(`[${s.getName()}] ID:${colId} StatusCol:${colStatus}`);

      if (colId === -1 && colId2 === -1) continue;

      const gid = s.getSheetId();
      for (let j = dataStartIdx; j < allData.length; j++) {
        const row = allData[j];
        let valId = String(row[colId] || '').trim();
        if ((!valId || valId === '') && colId2 !== -1) valId = String(row[colId2] || '').trim();

        if (!valId || valId === '面談ID' || valId === 'ID' || valId === '顧客ID') continue;

        const foundStatus = colStatus !== -1 ? String(row[colStatus] || '').trim() : '';

        if (!customerMap[valId]) {
          customerMap[valId] = {
            id: valId,
            name: String(row[colName] || '名無し'),
            link: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}&range=${j + 1}:${j + 1}`,
            status: foundStatus,
            date: ''
          };
        } else {
          // STATUS ENRICHMENT: If previous tab had no status, but this one does, UPDATE it.
          if (!customerMap[valId].status && foundStatus) {
            customerMap[valId].status = foundStatus;
          }
        }
      }
    }
  } catch (e) { log(`Error: ${e.toString()}`); }

  const customers = Object.values(customerMap);

  if (customers.length === 0) {
    customers.push({ id: 'DBG0', name: '⚠️ 読込失敗: デバッグログ表示', link: '' });
    debugLogs.forEach((l, i) => {
      customers.push({ id: `LOG${i}`, name: l.substring(0, 100), link: '' });
    });
  }

  try {
    cache.put(cacheKey, JSON.stringify(customers), 21600);
  } catch (e) {
    // Ignore cache error (Payload too large etc) - just return data
    log(`Cache Error: ${e.toString()}`);
  }
  return customers;
}

function getPaymentCustomerList(spreadsheetId, providedSs) {
  const ss = providedSs || openSsSafely(spreadsheetId, '\u500b\u5225\u30b7\u30fc\u30c8');
  const sheet = getSheetFuzzy(ss, SHEET_PAYMENT_LIST);
  if (!sheet) return [];

  // Use getDataRange to avoid "Empty Rows at Bottom" issue
  const allData = sheet.getDataRange().getValues();
  const hRows = allData.slice(0, 2);

  let headers = hRows[1].join('').includes('\u9762\u8ac7ID') ? hRows[1] : hRows[0];
  let offset = (hRows[1].join('').includes('\u9762\u8ac7ID') ? 2 : 1);

  const colId = findColIndex(headers, ['\u9762\u8ac7ID', 'ID']);
  const colId2 = findColIndex(headers, ['\u9867\u5ba2ID', 'CID']); // Secondary
  const colName = findColIndex(headers, ['\u5951\u7d04\u540d\u7fa9', '\u540d\u524d']);

  if ((colId === -1 && colId2 === -1) || colName === -1) return [];

  const customers = [], processed = new Set();
  // Iterate from bottom up
  for (let i = allData.length - 1; i >= offset; i--) {
    const row = allData[i];
    let id = String(row[colId] || '').trim();

    // Fallback ID
    if ((!id || id === '') && colId2 !== -1) {
      id = String(row[colId2] || '').trim();
    }

    if (id && id !== '' && !processed.has(id)) {
      customers.push({
        id: id,
        customerName: String(row[colName] || '名無し').trim(),
        link: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheet.getSheetId()}&range=${i + 1}:${i + 1}`
      });
      processed.add(id);
    }
  }
  return customers;
}

function getOverduePaymentList(spreadsheetId) {
  try {
    const ss = openSsSafely(spreadsheetId, '個別シート');
    const sheet = getSheetFuzzy(ss, SHEET_PAYMENT_LIST);
    if (!sheet) return [];

    const allData = sheet.getDataRange().getValues();
    if (allData.length <= 1) return [];

    const hRows = allData.slice(0, 2);
    let headers = hRows[1].join('').includes('面談ID') ? hRows[1] : hRows[0];
    let offset = (hRows[1].join('').includes('面談ID') ? 2 : 1);

    const colId = findColIndex(headers, ['面談ID', 'ID']);
    const colId2 = findColIndex(headers, ['顧客ID', 'CID']);
    const colName = findColIndex(headers, ['名前', '氏名', '契約名義']);
    const colDate = findColIndex(headers, ['契約締結日', '日付', '契約日']);
    const colAmount = findColIndex(headers, ['発生売上', '販売金額', '成約金額']);
    const colPaid = findColIndex(headers, ['現在入金額', '入金額', '入金済み']);

    const debugInfo = `ID:${colId} Name:${colName} Amt:${colAmount} Paid:${colPaid}`;
    log(`[Overdue] ${debugInfo}`);

    if (colId === -1 && colId2 === -1) return [];

    // Get current statuses
    const customerList = getCustomerList(spreadsheetId);
    const statusMap = {};
    customerList.forEach(c => { if (c.id) statusMap[c.id] = c.status; });

    // Finalize Exclusions List (Business Rule)
    const EXCLUDE = ['クーリングオフ', '入金前解除', '却下', 'キャンセル', '入金前解約', '契約前辞退', '非成約', '面談前キャンセル'];

    const overdue = [];
    for (let i = allData.length - 1; i >= offset; i--) {
      const row = allData[i];
      let id = String(row[colId] || '').trim();
      if ((!id || id === '') && colId2 !== -1) id = String(row[colId2] || '').trim();

      if (!id || id === 'ID' || id === '面談ID') continue;

      // Status check - Robust Fuzzy Match (Ignore Spacing/Full-width)
      const currentStatus = statusMap[id] || '';
      if (isMatchFuzzy(currentStatus, EXCLUDE)) continue;

      const amount = parsePrice(row[colAmount]);
      const paid = parsePrice(row[colPaid]);
      const dateVal = row[colDate] || '';

      // If amount > paid, it is an alert
      if (amount > paid) {
        try {
          const d = (dateVal && dateVal !== '') ? new Date(dateVal) : new Date();
          const diff = Math.floor((new Date() - d) / 86400000);
          overdue.push({
            id,
            customerName: String(row[colName] || '名無し').trim(),
            contractDate: dateVal ? Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy/MM/dd') : '----/--/--',
            overdueDays: diff >= 0 ? diff : 0,
            unpaidAmount: amount - paid
          });
        } catch (err) { /* invalid date */ }
      }
    }

    if (overdue.length === 0) {
      const hClip = headers.join('|').substring(0, 30);
      return [{
        id: 'DEBUG',
        customerName: `⚠️ 0件 (判定列: ${debugInfo})`,
        contractDate: `Head: ${hClip}`,
        overdueDays: 0,
        unpaidAmount: 0
      }];
    }
    // Newest first (Shortest overdue days at the top)
    return overdue.sort((a, b) => a.overdueDays - b.overdueDays);
  } catch (e) {
    console.error('getOverduePaymentList Error:', e);
    return [];
  }
}

function getPaymentMethods(spreadsheetId, providedSs) { return getMasterDropdowns().paymentGrouping; }
function getPaymentMethodsH(spreadsheetId, providedSs) { return getMasterDropdowns().paymentMethods; }

function getPlanList() {
  const ss = openSsSafely(AUTH_MASTER_SPREADSHEET_ID, '\u8a8d\u8a3c\u30de\u30b9\u30bf');
  const data = ss.getSheetByName(SHEET_PLAN_MASTER).getDataRange().getValues();
  const plans = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === true || data[i][5] === 'TRUE') {
      plans.push({ id: data[i][0], name: data[i][1], priceGeneral: data[i][2], priceBank: data[i][3], isInstallment: data[i][6] === true || data[i][6] === 'TRUE' });
    }
  }
  return plans;
}

function submitReport(formData) {
  try {
    const ss = openSsSafely(formData.spreadsheetId, '個別シート');
    const sheet = getSheetFuzzy(ss, SHEET_PAYMENT_LIST);
    if (!sheet) throw new Error('「入金管理リスト」シートが見つからないぜ。');

    // Find existing row by Interview ID
    const found = sheet.getRange('A:A').createTextFinder(formData.interviewId).matchEntireCell(true).findNext();
    let row;
    if (found) {
      row = found.getRow();
    } else {
      // Find FIRST empty row in Col A starting from row 3 (after headers)
      const vals = sheet.getRange('A:A').getValues();
      row = vals.length + 1; // Default to absolute end if no empty row found in current range
      for (let i = 2; i < vals.length; i++) {
        if (!vals[i][0] || String(vals[i][0]).trim() === "") { row = i + 1; break; }
      }
    }

    // Safety check: Don't overwrite headers
    if (row < 3) row = 3;

    // 入力規則違反を防ぐため、個別にセルへ書き込む（空文字はスキップ）
    sheet.getRange(row, 1).setValue(formData.interviewId);
    sheet.getRange(row, 2).setValue(formData.contractName);
    if (formData.onboarding) sheet.getRange(row, 3).setValue('◯');
    sheet.getRange(row, 4).setValue(formData.paymentMethod);
    sheet.getRange(row, 5).setValue(formData.contractDate);
    sheet.getRange(row, 10).setValue(formData.salesAmount);
    if (formData.notes) sheet.getRange(row, 2).setNote(formData.notes.trim());
    return { success: true, message: '報告完了だぜ！' };
  } catch (e) { return { success: false, message: e.toString() }; }
}

function submitPayment(formData) {
  try {
    const ss = openSsSafely(formData.spreadsheetId, '個別シート');
    const sheet = getSheetFuzzy(ss, SHEET_PAYMENT_LIST);
    if (!sheet) throw new Error('「入金管理リスト」シートが見つからないぜ。');

    // Find row by Interview ID (Col A)
    const found = sheet.getRange('A:A').createTextFinder(formData.customerId).matchEntireCell(true).findNext();
    if (!found) return { success: false, message: '顧客（面談ID）がシートで見つからないぜ。' };
    const r = found.getRow();

    // Find empty slot for payment (Columns M, Q, U... every 4 columns)
    for (let c = 13; c < 13 + 12 * 4; c += 4) {
      if (!sheet.getRange(r, c).getValue()) {
        sheet.getRange(r, c, 1, 3).setValues([[formData.paymentDate, formData.paymentAmount, formData.paymentMethod]]);
        return { success: true, message: '入金報告完了だぜ！' };
      }
    }
    return { success: false, message: '入金枠がいっぱいだぜ。管理者に相談してくれ。' };
  } catch (e) { return { success: false, message: e.toString() }; }
}

function generatePINs() {
  const ss = openSsSafely(AUTH_MASTER_SPREADSHEET_ID, '\u8a8d\u8a3c\u30de\u30b9\u30bf');
  const sheet = ss.getSheetByName(AUTH_MASTER_SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const used = new Set();
  data.forEach(r => used.add(String(r[4])));
  for (let i = 1; i < data.length; i++) {
    if (!data[i][4] && data[i][0]) {
      let pin; do { pin = String(Math.floor(1000 + Math.random() * 9000)); } while (used.has(pin));
      used.add(pin); sheet.getRange(i + 1, 5).setValue(pin);
    }
  }
}

function authenticateByPIN(pin) {
  try {
    const ss = openSsSafely(AUTH_MASTER_SPREADSHEET_ID, '\u8a8d\u8a3c\u30de\u30b9\u30bf');
    const data = ss.getSheetByName(AUTH_MASTER_SHEET_NAME).getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][4]) === String(pin)) {
        let id = String(data[i][2]).trim();
        if (!id && String(data[i][1]).includes('/d/')) id = String(data[i][1]).split('/d/')[1].split('/')[0];
        return { success: true, staffName: data[i][0], spreadsheetId: id };
      }
    }
    return { success: false, message: 'PIN\u4e0d\u4e00\u81f4' };
  } catch (e) { return { success: false, message: e.toString() }; }
}

function getMasterDropdowns() {
  const ss = openSsSafely(DATA_MASTER_SPREADSHEET_ID, 'Master Data');
  const sheet = ss.getSheetByName(SHEET_MASTER_DROPDOWN) || ss.getSheetByName(SHEET_DROPDOWN);
  if (!sheet) return { paymentMethods: [], paymentGrouping: {} };

  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // Column B (Index 2 in 1-base, Index 1 in 0-base data)
  // getRange(row, col, numRows, numCols) -> col 2 is B.

  const paymentMethods = [];
  data.forEach(r => {
    const val = String(r[0]).trim();
    if (val) paymentMethods.push(val);
  });

  return { paymentMethods: paymentMethods, paymentGrouping: {} };
}

function getStaffInfoBySheetId(targetId, providedSs) {
  try {
    const ss = openSsSafely(AUTH_MASTER_SPREADSHEET_ID, 'Auth Master');
    const data = ss.getSheetByName(AUTH_MASTER_SHEET_NAME).getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      // Check ID (Col 2/Index 2) or URL (Col 1/Index 1)
      let id = String(data[i][2]).trim();
      if (!id && String(data[i][1]).includes('/d/')) id = String(data[i][1]).split('/d/')[1].split('/')[0];

      if (id === targetId) {
        return { name: data[i][0] };
      }
    }
  } catch (e) { console.error(e); }
  return { name: '不明なスタッフ' };
}

function getInitialData(spreadsheetId, staffName) {
  return {
    planList: getPlanList(),
    customerList: getCustomerList(spreadsheetId, staffName),
    paymentCustomerList: getPaymentCustomerList(spreadsheetId), // ADDED
    paymentMethods: getMasterDropdowns().paymentMethods,
    paymentMethodsH: getMasterDropdowns().paymentMethods, // ADDED for PaymentForm
    systemVersion: 'v2026.0124.0830_SCAN_RANGE_FIX' // UPDATED VERSION
  };
}

function doPost(e) {
  try {
    const json = JSON.parse(e.postData.contents);
    const action = json.action;
    const p = json.params || {}; // Extract params from nested object
    let result;

    switch (action) {
      case 'getInitialData':
        result = getInitialData(p.spreadsheetId, p.staffName);
        break;
      case 'getCustomerList':
        result = getCustomerList(p.spreadsheetId, p.staffName, null, p.targetGid);
        break;
      case 'getPaymentCustomerList':
        result = getPaymentCustomerList(p.spreadsheetId);
        break;
      case 'getOverduePaymentList':
        result = getOverduePaymentList(p.spreadsheetId);
        break;
      case 'submitReport':
        result = submitReport(p.formData || p);
        break;
      case 'submitPayment':
        result = submitPayment(p.formData || p);
        break;
      case 'authenticateByPIN':
        result = authenticateByPIN(p.pin);
        break;
      case 'getPlanList':
        result = getPlanList();
        break;
      case 'getPaymentMethods':
        result = getPaymentMethods();
        break;
      default:
        result = { error: 'Invalid action' };
    }

    // Wrapped Response for Wrapper Client
    const response = { success: true, data: result };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // Return standard error format for client
    const errorResponse = { success: false, message: `GAS Error: ${err.toString()}` };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', version: 'v503_restored' }))
    .setMimeType(ContentService.MimeType.JSON);
}
