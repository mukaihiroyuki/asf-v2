// ========================================
// ASF 2.0 Global Settings
// ========================================

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

  log(`[Start v503] Staff: ${providedStaffName}`);

  const ss = providedSs || openSsSafely(spreadsheetId, '\u500b\u5225\u30b7\u30fc\u30c8');
  let staffName = providedStaffName;
  if (!staffName) staffName = getStaffInfoBySheetId(spreadsheetId, ss).name;

  const cacheKey = 'customer_list_v503_' + spreadsheetId;
  const cache = CacheService.getUserCache();

  // Cache disabled for debugging
  // const cached = cache.get(cacheKey);
  // if (cached) { try { return JSON.parse(cached); } catch (e) { } }

  const customers = [];
  const processedIds = new Set();

  try {
    const primaryNames = ['\u9867\u5ba2\u30ea\u30b9\u30c8', '\u9762\u8ac7\u8a18\u5165'];
    let targetSheets = primaryNames.map(name => getSheetFuzzy(ss, name)).filter(s => s !== null);

    if (targetGid) {
      const gidS = ss.getSheets().find(sh => String(sh.getSheetId()) === String(targetGid));
      if (gidS && targetSheets.indexOf(gidS) === -1) targetSheets.push(gidS);
    }

    if (targetSheets.length === 0) {
      log('Warn: No named sheets found. Scanning all...');
      for (const sh of ss.getSheets()) {
        const hVal = sh.getRange(1, 1, 2, 5).getValues().map(r => r.join('')).join('');
        if (hVal.includes('\u9762\u8ac7ID')) targetSheets.push(sh);
      }
    }

    log(`Sheets found: ${targetSheets.length}`);

    for (const s of targetSheets) {
      const lastRow = s.getLastRow();
      if (lastRow <= 1) { log(`Skip ${s.getName()} (empty)`); continue; }

      const fetchCount = 600;
      const startRow = Math.max(1, lastRow - fetchCount + 1);
      const sData = s.getRange(startRow, 1, Math.min(fetchCount, lastRow), s.getLastColumn()).getValues();
      const hData = s.getRange(1, 1, 2, s.getLastColumn()).getValues();

      let headers = hData[1].join('').includes('\u9762\u8ac7ID') ? hData[1] : hData[0];
      let dataStartIdx = (startRow === 1) ? (hData[1].join('').includes('\u9762\u8ac7ID') ? 2 : 1) : 0;

      const colId = findColIndex(headers, ['\u9762\u8ac7ID', 'ID']);
      const colName = findColIndex(headers, ['\u540d\u524d', '\u6c0f\u540d']);

      log(`[${s.getName()}] ID:${colId} Name:${colName}`);

      if (colId === -1) continue;

      const gid = s.getSheetId();
      for (let j = sData.length - 1; j >= dataStartIdx; j--) {
        const row = sData[j];
        const valId = String(row[colId] || '').trim();
        if (valId && valId !== '' && valId !== '\u9762\u8ac7ID' && valId !== 'ID' && !processedIds.has(valId)) {
          // BYPASS FILTER STRICTLY (ALL DATA)
          customers.push({
            id: valId,
            name: String(row[colName] || '名無し'),
            link: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}&range=${startRow + j}:${startRow + j}`,
            status: '', date: ''
          });
          processedIds.add(valId);
        }
      }
    }
  } catch (e) { log(`Error: ${e.toString()}`); }

  // IF NO CUSTOMERS, RETURN LOGS
  if (customers.length === 0) {
    customers.push({ id: 'DBG0', name: '⚠️ デバッグモード v503', link: '' });
    debugLogs.forEach((l, i) => {
      customers.push({ id: `LOG${i}`, name: l.substring(0, 100), link: '' });
    });
  }

  cache.put(cacheKey, JSON.stringify(customers), 21600);
  return customers;
}

function getPaymentCustomerList(spreadsheetId, providedSs) {
  const ss = providedSs || openSsSafely(spreadsheetId, '\u500b\u5225\u30b7\u30fc\u30c8');
  const sheet = getSheetFuzzy(ss, SHEET_PAYMENT_LIST);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const readStart = Math.max(1, lastRow - 500 + 1);
  const data = sheet.getRange(readStart, 1, Math.min(500, lastRow), sheet.getLastColumn()).getValues();
  const hRows = sheet.getRange(1, 1, 2, sheet.getLastColumn()).getValues();
  let headers = hRows[1].join('').includes('\u9762\u8ac7ID') ? hRows[1] : hRows[0];
  let offset = (readStart === 1) ? (hRows[1].join('').includes('\u9762\u8ac7ID') ? 2 : 1) : 0;
  const colId = findColIndex(headers, ['\u9762\u8ac7ID', 'ID']);
  const colName = findColIndex(headers, ['\u5951\u7d04\u540d\u7fa9', '\u540d\u524d']);
  if (colId === -1 || colName === -1) return [];
  const customers = [], processed = new Set();
  for (let i = data.length - 1; i >= offset; i--) {
    const id = String(data[i][colId]).trim();
    if (id && id !== '' && !processed.has(id)) {
      customers.push({ id: id, customerName: String(data[i][colName]).trim(), link: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheet.getSheetId()}&range=${readStart + i}:${readStart + i}` });
      processed.add(id);
    }
  }
  return customers;
}

function getOverduePaymentList(spreadsheetId) {
  const ss = openSsSafely(spreadsheetId, '\u500b\u5225\u30b7\u30fc\u30c8');
  const sheet = ss.getSheetByName(SHEET_PAYMENT_LIST);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const customerList = getCustomerList(spreadsheetId);
  const statusMap = {};
  customerList.forEach(c => { statusMap[c.id] = c.status; });
  const INCLUDED = ['\u6210\u7d04', '\u5951\u7d04\u6e08\u307f(\u5165\u91d1\u5f85\u3061)'];
  const overdue = [];
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i], id = String(row[0]).trim();
    if (!id || !INCLUDED.includes(statusMap[id])) continue;
    const amount = Number(row[9]) || 0, paid = Number(row[10]) || 0;
    if (amount > paid && row[4]) {
      const diff = Math.floor((new Date() - new Date(row[4])) / 86400000);
      overdue.push({ id, customerName: String(row[1]).trim(), contractDate: Utilities.formatDate(new Date(row[4]), 'Asia/Tokyo', 'yyyy/MM/dd'), overdueDays: diff });
    }
  }
  return overdue.sort((a, b) => a.overdueDays - b.overdueDays);
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
    const ss = openSsSafely(formData.spreadsheetId, '\u500b\u5225\u30b7\u30fc\u30c8');
    const sheet = ss.getSheetByName(SHEET_PAYMENT_LIST);
    const found = sheet.getRange('A:A').createTextFinder(formData.interviewId).matchEntireCell(true).findNext();
    const row = found ? found.getRow() : sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, 6).setValues([[formData.interviewId, formData.contractName, formData.onboarding ? '\u25ef' : '', formData.paymentMethod, formData.contractDate, '']]);
    sheet.getRange(row, 10).setValue(formData.salesAmount);
    if (formData.notes) sheet.getRange(row, 2).setNote(formData.notes.trim());
    return { success: true, message: '\u5831\u544a\u5b8c\u4e86' };
  } catch (e) { return { success: false, message: e.toString() }; }
}

function submitPayment(formData) {
  try {
    const ss = openSsSafely(formData.spreadsheetId, '\u500b\u5225\u30b7\u30fc\u30c8');
    const sheet = ss.getSheetByName(SHEET_PAYMENT_LIST);
    const found = sheet.getRange('A:A').createTextFinder(formData.customerId).matchEntireCell(true).findNext();
    if (!found) return { success: false, message: '\u9867\u5ba2\u4e0d\u660e' };
    const r = found.getRow();
    for (let c = 13; c < 13 + 12 * 4; c += 4) {
      if (!sheet.getRange(r, c).getValue()) {
        sheet.getRange(r, c, 1, 3).setValues([[formData.paymentDate, formData.paymentAmount, formData.paymentMethod]]);
        return { success: true, message: '\u5165\u91d1\u5831\u544a\u5b8c\u4e86' };
      }
    }
    return { success: false, message: '\u30b9\u30ed\u30c3\u30c8\u6e80\u676f' };
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
