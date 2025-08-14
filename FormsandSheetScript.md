so here is the thing dude i am doing a Very Complex Seva in Janmastahmi  , i want to create a Dashboard from many google sheets a dashboard that shows me real update of the thing like i created a dasboard earlier from the sheets i am doing seva in multiple departments together 

so here is the thing 

FOR OVERALL , THIS IS THE CRITERIA 
 THERE ARE 4 ZONES 
  we have divided the seva in 4 Zones Each Zone contains Many sector here are the bydefault sector list [ { (Zone 1 - Sector 1 , Sector 2 ) , ( Zone 2 - Sector 3 , Sector 4 , Sector 5 , Sector  6 ) , ( Zone 3 - Sector 7 , Sector 8 and yes Sector 11) , ( Zone 4 - Sector 9 & Sector 10 )}] , 


1) LED/T.V
2) EQUIPMENTS
3) PA 
4) C.C.T.V 


  1) LED/TV 
  So here is the thing Staring from LED/TV I created a form first I have attached the form @LEDTV.png you can see take this as row cause we might change the form , then you know what i did i also created a sheet then i linked it to it and then i gave a app script for the real time update of the sheet as the form filled the script is this "// === Main handler (install trigger: From spreadsheet -> On form submit) ===
function onFormSubmit(e) {
  if (!e || !e.namedValues) {
    Logger.log("Do not run manually. This must be triggered by a form submit.");
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const LIVE_SHEET_NAMES = ["Live-Update", "Live-Report", "Live-Update "];
  const ISSUE_SHEET_NAME = "Issue-History";
  const ALERT_EMAIL = "gaurangagovindaked@gmail.com";

  // find live sheet
  let live = null;
  for (const n of LIVE_SHEET_NAMES) {
    const s = ss.getSheetByName(n);
    if (s) { live = s; break; }
  }
  if (!live) throw new Error("Can't find Live sheet. Create 'Live-Update' or 'Live-Report'.");

  const nv = e.namedValues;     // question title -> [answer]
  const keys = Object.keys(nv);

  // Helper: find key using patterns (exact then partial)
  function findKey(patterns) {
    patterns = Array.isArray(patterns) ? patterns : [patterns];
    const lk = keys.map(k => ({ raw: k, lower: k.toLowerCase() }));
    for (const p of patterns) {
      const lp = p.toLowerCase();
      for (const it of lk) if (it.lower === lp) return it.raw;
    }
    for (const p of patterns) {
      const lp = p.toLowerCase();
      for (const it of lk) if (it.lower.indexOf(lp) !== -1) return it.raw;
    }
    return null;
  }
  function v(patterns) {
    const k = findKey(patterns);
    return k ? (nv[k] && nv[k][0] ? nv[k][0] : "") : "";
  }

  // Resolve fields from the form (try multiple label variants)
  const timestamp = e.values && e.values[0] ? e.values[0] : v(["timestamp","time stamp","time"]);
  const name = v(["your name","name","reporter"]);
  const phone = v(["phone no","phone number","phone","phone no."]);            // NEW: phone
  const zone = v(["select zone","zone"]);
  // Sector: form uses per-zone sector fields like "Select Sector in Zone 1"
  const sector = resolveSector(zone, keys, nv) || v(["select sector","sector"]);
  // Screen: try sector-specific screen keys then any screen key
  const rawScreen = resolveScreen(sector, keys, nv) || v(["select screen","screen id","screen"]);
  const screenId = /temple\s*hall/i.test(rawScreen || "") ? "" : (rawScreen || "");
  const status = v(["status","issue","working","issue-reporting","issue-reported","issue or problem"]);
  const evidenceRaw = v(["upload","video","image","evidence","kindly upload","upload video","upload image"]);
  const evidence = makeEvidenceLink(evidenceRaw);

  // Determine identifier: prefer non-empty screenId; otherwise use zone+sector
  const useScreenKey = screenId && screenId.toString().trim().length > 0;
  const identifier = useScreenKey ? ("SCREEN::" + screenId.toString().trim()) : ("LOC::" + (zone||"").toString().trim() + "::" + (sector||"").toString().trim());

  // ====== Find header indices on Live sheet (case-insensitive) ======
  const lastCol = Math.max(8, live.getLastColumn()); // ensure at least 8 cols expected (now includes Phone)
  const headers = live.getRange(1,1,1,lastCol).getValues()[0].map(h => (h||"").toString());
  const headerIndex = {}; // lower->1-based index
  headers.forEach((h,i) => headerIndex[(h||"").toString().toLowerCase().trim()] = i+1);

  // header names we expect (common variants)
  const col_timestamp = headerIndex["time stamp"] || headerIndex["timestamp"] || 1;
  const col_name = headerIndex["name"] || 2;
  const col_phone = headerIndex["phone no"] || headerIndex["phone number"] || headerIndex["phone"] || 3; // NEW
  const col_zone = headerIndex["zone"] || 4;
  const col_sector = headerIndex["sector"] || 5;
  const col_screen = headerIndex["screen id"] || headerIndex["screen"] || 6;
  const col_status = headerIndex["status"] || headerIndex["issue-reported"] || 7;
  const col_evidence = headerIndex["evidence"] || headerIndex["upload video"] || headerIndex["upload image"] || 8;

  // ====== Search existing rows for same screen or same zone+sector ======
  const lastRow = live.getLastRow();
  let foundRow = -1;
  if (lastRow >= 2) {
    const data = live.getRange(2,1,lastRow-1, Math.max(lastCol,8)).getValues(); // 0-based array
    for (let i=0;i<data.length;i++){
      const r = data[i];
      // screen column check
      const existingScreen = (r[col_screen-1] || "").toString().trim();
      const existingZone = (r[col_zone-1] || "").toString().trim();
      const existingSector = (r[col_sector-1] || "").toString().trim();
      const existingKey = existingScreen ? ("SCREEN::" + existingScreen) : ("LOC::" + existingZone + "::" + existingSector);
      if (existingKey === identifier) { foundRow = i + 2; break; }
    }
  }

  // Prepare new values for the row
  // We'll update only the important columns (timestamp, name, phone, zone, sector, screen, status, evidence)
  if (foundRow !== -1) {
    // update existing row
    if (col_timestamp) live.getRange(foundRow, col_timestamp).setValue(timestamp);
    if (col_name) live.getRange(foundRow, col_name).setValue(name);
    if (col_phone) live.getRange(foundRow, col_phone).setValue(phone);               // NEW
    if (col_zone) live.getRange(foundRow, col_zone).setValue(zone);
    if (col_sector) live.getRange(foundRow, col_sector).setValue(sector);
    if (col_screen) live.getRange(foundRow, col_screen).setValue(screenId);
    if (col_status) live.getRange(foundRow, col_status).setValue(status);
    if (col_evidence) live.getRange(foundRow, col_evidence).setValue(evidence);

    // color the whole row (only across columns used)
    const colorRange = live.getRange(foundRow, 1, 1, Math.max(lastCol,8));
    applyStatusColor(colorRange, status);

  } else {
    // append new row (create an array for columns 1..lastCol)
    const newRow = new Array(Math.max(lastCol,8)).fill("");
    newRow[col_timestamp-1] = timestamp;
    newRow[col_name-1] = name;
    newRow[col_phone-1] = phone;                                                      // NEW
    newRow[col_zone-1] = zone;
    newRow[col_sector-1] = sector;
    newRow[col_screen-1] = screenId;
    newRow[col_status-1] = status;
    newRow[col_evidence-1] = evidence;
    live.appendRow(newRow);

    // color last row
    const newLast = live.getLastRow();
    const colorRange = live.getRange(newLast, 1, 1, Math.max(lastCol,8));
    applyStatusColor(colorRange, status);
  }

  // ====== Issue-History and Email: if status contains "issue" (case-insensitive) then log and email ======
  if (typeof status === "string" && status.toLowerCase().indexOf("issue") !== -1) {
    let issueSheet = ss.getSheetByName(ISSUE_SHEET_NAME);
    if (!issueSheet) {
      issueSheet = ss.insertSheet(ISSUE_SHEET_NAME);
      issueSheet.appendRow(["TIME STAMP","NAME","PHONE","ZONE","SECTOR","SCREEN ID","ISSUE-REPORTED","EVIDENCE"]); // phone added
    }
    // Find the specific "ISSUE-REPORTED" question if exists (some forms have a separate issue text field)
    const issueText = (function(){
      const k = findKeyInMap(nv, ["issue-reported","issue reporting","issue or problem","issue / problem","issue"]);
      return k ? (nv[k][0]||"") : status;
    })();
    issueSheet.appendRow([timestamp, name, phone, zone, sector, screenId, issueText, evidence]); // phone included

    // Send email
    const subject = `⚠️ LED/TV Issue — ${screenId || sector || zone || "Unknown"}`;
    const body =
      `New issue reported\n\n` +
      `Time: ${timestamp}\n` +
      `Name: ${name}\n` +
      `Phone: ${phone || "N/A"}\n` +                           // phone in email
      `Zone: ${zone}\n` +
      `Sector: ${sector}\n` +
      `Screen ID: ${screenId || "N/A"}\n` +
      `Issue detail: ${issueText}\n` +
      `Evidence: ${evidence || "No file"}\n\n` +
      `Open sheet: ${live.getName()}`;
    MailApp.sendEmail(ALERT_EMAIL, subject, body);
  }

  // done
  Logger.log("Live update processed for " + (screenId || zone + " / " + sector));
}


// ---------------- helpers ----------------

function applyStatusColor(range, statusText) {
  if (!statusText) { range.setBackground(null); return; }
  const s = statusText.toString().toLowerCase();
  if (s.indexOf("issue") !== -1) {
    range.setBackground("#ffd6d6"); // light red
  } else if (s.indexOf("fine") !== -1) {
    range.setBackground("#d6ffd6"); // light green
  } else {
    range.setBackground(null);
  }
}

// find key with patterns in namedValues map (nv)
function findKeyInMap(nv, patterns) {
  const keys = Object.keys(nv || {});
  const lk = keys.map(k=>({raw:k,lower:k.toLowerCase()}));
  for (const p of patterns) {
    const pp = p.toLowerCase();
    for (const it of lk) if (it.lower === pp) return it.raw;
  }
  for (const p of patterns) {
    const pp = p.toLowerCase();
    for (const it of lk) if (it.lower.indexOf(pp) !== -1) return it.raw;
  }
  return null;
}


// resolve sector based on zone using namedValues keys
function resolveSector(zoneText, keys, nv) {
  if (!zoneText) return "";
  const lowZone = zoneText.toString().toLowerCase().replace(/\s+/g,"");
  for (const k of keys) {
    const lk = k.toLowerCase().replace(/\s+/g,"");
    if (lk.indexOf("sector") !== -1 && lk.indexOf(lowZone) !== -1) {
      return nv[k] && nv[k][0] ? nv[k][0] : "";
    }
  }
  // fallback to any sector field
  const key = findKeyInMap(nv, ["select sector","sector"]);
  return key ? (nv[key][0]||"") : "";
}

// resolve screen based on sector using namedValues keys
function resolveScreen(sectorText, keys, nv) {
  if (sectorText) {
    const lowSec = sectorText.toString().toLowerCase().replace(/\s+/g,"");
    for (const k of keys) {
      const lk = k.toLowerCase().replace(/\s+/g,"");
      if (lk.indexOf("screen") !== -1 && lk.indexOf(lowSec) !== -1) {
        return nv[k] && nv[k][0] ? nv[k][0] : "";
      }
    }
  }
  // fallback to any screen field
  const key = findKeyInMap(nv, ["select screen","screen id","screen"]);
  return key ? (nv[key][0]||"") : "";
}

/**
 * Turn raw upload text into Drive URL if possible.
 */
function makeEvidenceLink(raw) {
  if (!raw) return "";
  const candidate = Array.isArray(raw) ? raw[0] : String(raw);
  if (candidate.indexOf("http") === 0) return candidate;
  const match = candidate.match(/[-\w]{25,}/);
  if (match) {
    const fileId = match[0];
    try {
      const f = DriveApp.getFileById(fileId);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return f.getUrl();
    } catch (e) {
      return candidate;
    }
  }
  return candidate;
}
"  this was the script i got then i got some very good results dude i got the real time working sheet that works very good when i fill form it shows issues with red and working fine with green and saves the issue history i have attached the screenshots of the sheet images 

{ check out @LEDTV1.png and @LEDTV2.png } for the past the LED/TV Contexts 













2) EQUIPMENTS 

Also this follows the same Zone and sector stuff more details are in the {@EQUIPMENTSFORM.png}please take the form as it is dude and here is thescript i putted in the google sheet {"
// CONFIG
const LIVE_SHEET_NAMES = ["Live-Update","Live-Report","Live-Update "];
const ISSUE_SHEET_NAME = "Issue-History";
const ALERT_EMAIL = "gaurangagovindaked@gmail.com"; // change if needed

function onFormSubmit(e) {
  if (!e || !e.namedValues) { Logger.log("Run via form submit only."); return; }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nv = e.namedValues;
  const keys = Object.keys(nv);

  // helpers to find form keys (exact then partial, case-insensitive)
  function findKey(patterns) {
    patterns = Array.isArray(patterns) ? patterns : [patterns];
    const lk = keys.map(k=>({raw:k, lower:k.toLowerCase()}));
    for (const p of patterns) {
      const pp = p.toLowerCase();
      for (const it of lk) if (it.lower === pp) return it.raw;
    }
    for (const p of patterns) {
      const pp = p.toLowerCase();
      for (const it of lk) if (it.lower.indexOf(pp) !== -1) return it.raw;
    }
    return null;
  }
  function getVal(patterns){ const k = findKey(patterns); return k ? (nv[k] && nv[k][0] ? nv[k][0] : "") : ""; }
  function getAllVal(patterns){ const k = findKey(patterns); if(!k) return ""; const v = nv[k]; return Array.isArray(v) ? v.join(", ") : (v[0]||""); }

  // parse basic fields
  const timestamp = e.values && e.values[0] ? e.values[0] : getVal(["timestamp","time stamp","time"]);
  const name = getVal(["your name","name","reporter"]);
  const phone = getVal(["phone no","phone number","phone"]);
  const zone = getVal(["select zone","zone"]);
  const sector = resolveSector(zone, keys, nv) || getVal(["select sector","sector"]);
  // location: robust resolution (see function below)
  const location = resolveLocation(sector, keys, nv) || getVal(["location","choose location"]);
  // equipment: collect from any equipment field(s)
  const equipmentRaw = resolveEquipment(keys, nv) || getAllVal(["equipment","equipments","equipment type"]);
  const equipmentList = splitEquipment(equipmentRaw);
  const status = getVal(["status","issue","issue-reporting","issue-reported","working"]);
  // issue text: prefer explicit issue/problem field, else use status if it clearly says issue
  const issueText = (function(){
    const k = findKey(["issue or problem","issue reporting","issue details","issue","problem","issue / problem","issue detail"]);
    if (k && nv[k] && nv[k][0]) return nv[k][0];
    return (status && /issue/i.test(status)) ? status : "";
  })();
  const evidenceRaw = getAllVal(["upload","video","image","evidence","kindly upload","upload video","upload image"]);
  const evidence = makeEvidenceLink(evidenceRaw);

  // find live sheet
  let live = null;
  for (const n of LIVE_SHEET_NAMES) { const s = ss.getSheetByName(n); if (s) { live = s; break; } }
  if (!live) throw new Error("Can't find Live sheet. Create 'Live-Update' or 'Live-Report'.");

  // map headers (case-insensitive)
  const lastCol = Math.max(9, live.getLastColumn());
  const headers = live.getRange(1,1,1,lastCol).getValues()[0].map(h => (h||"").toString());
  const headerIndex = {};
  headers.forEach((h,i) => headerIndex[(h||"").toString().toLowerCase().trim()] = i+1);

  const col_timestamp = headerIndex["time stamp"] || headerIndex["timestamp"] || 1;
  const col_name = headerIndex["name"] || 2;
  const col_phone = headerIndex["phone no"] || headerIndex["phone number"] || headerIndex["phone"] || 3;
  const col_zone = headerIndex["zone"] || 4;
  const col_sector = headerIndex["sector"] || 5;
  const col_location = headerIndex["location"] || headerIndex["loc"] || 6;
  const col_equipment = headerIndex["equipment"] || headerIndex["equipments"] || 7;
  const col_status = headerIndex["status"] || headerIndex["issue"] || 8;
  const col_evidence = headerIndex["evidence"] || 9;

  // cache existing live rows for searching
  const lastRow = live.getLastRow();
  const data = lastRow >= 2 ? live.getRange(2,1,lastRow-1, Math.max(lastCol,9)).getValues() : [];

  // for each equipment in the submission update or append a row (one row per equipment)
  equipmentList.forEach(eqRaw => {
    const eq = eqRaw.trim();
    if (!eq) return;
    const identifier = buildIdentifier(location, zone, sector, eq);

    // search for existing row with same identifier (equipment + location/zone+sector)
    let foundRow = -1;
    for (let i=0;i<data.length;i++){
      const r = data[i];
      const existingLoc = (r[col_location-1] || "").toString().trim();
      const existingZone = (r[col_zone-1] || "").toString().trim();
      const existingSector = (r[col_sector-1] || "").toString().trim();
      const existingEquip = (r[col_equipment-1] || "").toString().trim();
      const existingId = buildIdentifier(existingLoc || "", existingZone, existingSector, existingEquip);
      if (existingId === identifier) { foundRow = i + 2; break; }
    }

    // prepare row values
    const rowArr = new Array(Math.max(lastCol,9)).fill("");
    rowArr[col_timestamp-1] = timestamp;
    rowArr[col_name-1] = name;
    rowArr[col_phone-1] = phone;
    rowArr[col_zone-1] = zone;
    rowArr[col_sector-1] = sector;
    rowArr[col_location-1] = location;
    rowArr[col_equipment-1] = eq;
    rowArr[col_status-1] = status;
    rowArr[col_evidence-1] = evidence;

    if (foundRow !== -1) {
      const range = live.getRange(foundRow,1,1,Math.max(lastCol,9));
      const existing = range.getValues()[0];
      for (let c=0;c<existing.length;c++){
        if (rowArr[c] !== "" && typeof rowArr[c] !== "undefined") existing[c] = rowArr[c];
      }
      range.setValues([existing]);
      applyStatusColor(live.getRange(foundRow,1,1,Math.max(lastCol,9)), status);
    } else {
      live.appendRow(rowArr);
      const appended = live.getLastRow();
      applyStatusColor(live.getRange(appended,1,1,Math.max(lastCol,9)), status);
      data.push(rowArr); // reflect in-memory
    }

    // ISSUE-HISTORY: append if status indicates issue OR volunteer provided any non-empty issue text
    const statusIndicatesIssue = status && /issue|not working|broken|fault|problem/i.test(status);
    const hasIssueText = issueText && issueText.toString().trim().length > 0 && !/working/i.test(issueText);
    if (statusIndicatesIssue || hasIssueText) {
      appendIssueRow(ss, timestamp, name, phone, zone, sector, location, eq, issueText || status, evidence);
    }
  });

  Logger.log("Processed: " + (location || (zone + "/" + sector)) + " -> " + equipmentList.join(", "));
}


// ---------- small utilities ----------

function buildIdentifier(location, zone, sector, equipment) {
  const loc = (location || "").toString().trim();
  const z = (zone || "").toString().trim();
  const s = (sector || "").toString().trim();
  const e = (equipment || "").toString().trim();
  if (loc) return ("LOC::" + loc.toLowerCase() + "::" + e.toLowerCase());
  return ("LOC::" + z.toLowerCase() + "::" + s.toLowerCase() + "::" + e.toLowerCase());
}

function applyStatusColor(range, statusText) {
  if (!statusText) { range.setBackground(null); return; }
  const s = statusText.toString().toLowerCase();
  if (s.indexOf("issue") !== -1 || s.indexOf("not working") !== -1 || s.indexOf("broken") !== -1) range.setBackground("#ffd6d6");
  else if (s.indexOf("fine") !== -1 || s.indexOf("working") !== -1) range.setBackground("#d6ffd6");
  else range.setBackground(null);
}

function appendIssueRow(ss, timestamp, name, phone, zone, sector, location, equipment, issueText, evidence) {
  let issueSheet = ss.getSheetByName(ISSUE_SHEET_NAME);
  if (!issueSheet) {
    issueSheet = ss.insertSheet(ISSUE_SHEET_NAME);
    issueSheet.appendRow(["TIME STAMP","NAME","PHONE","ZONE","SECTOR","LOCATION","EQUIPMENT","ISSUE-REPORTED","EVIDENCE"]);
  }
  issueSheet.appendRow([timestamp, name, phone, zone, sector, location, equipment, issueText || "", evidence || ""]);
  try {
    const subject = `⚠️ Equipment Issue — ${location || (zone + " / " + sector) || "Unknown"} :: ${equipment || ""}`;
    const body = `Time: ${timestamp}\nName: ${name}\nPhone: ${phone || "N/A"}\nZone: ${zone}\nSector: ${sector}\nLocation: ${location || "N/A"}\nEquipment: ${equipment}\nIssue: ${issueText}\nEvidence: ${evidence || "No file"}`;
    MailApp.sendEmail(ALERT_EMAIL, subject, body);
  } catch (err) { Logger.log("Email error: " + err); }
}

// Resolve sector by looking for a key that contains both 'sector' and zone
function resolveSector(zoneText, keys, nv) {
  if (!zoneText) return "";
  const lowZone = zoneText.toString().toLowerCase().replace(/\s+/g,"");
  for (const k of keys) {
    const lk = k.toLowerCase().replace(/\s+/g,"");
    if (lk.indexOf("sector") !== -1 && lk.indexOf(lowZone)!==-1) return nv[k] && nv[k][0] ? nv[k][0] : "";
  }
  // fallback
  const key = findKeyGeneric(keys, ["select sector","sector"]);
  return key ? (nv[key][0]||"") : "";
}

// Resolve location: prefer a key containing both 'location' and the sector name; otherwise any non-empty location field
function resolveLocation(sectorText, keys, nv) {
  const lowSector = sectorText ? sectorText.toString().toLowerCase().replace(/\s+/g,"") : "";
  // 1) keys that have "location" and sector name
  for (const k of keys) {
    const lk = k.toLowerCase().replace(/\s+/g,"");
    if (lk.indexOf("location") !== -1 && lowSector && lk.indexOf(lowSector) !== -1) {
      const val = nv[k] && nv[k][0] ? nv[k][0] : "";
      if (val && val.toString().trim().length) return val;
    }
  }
  // 2) any "location" key that has a non-empty value
  for (const k of keys) {
    const lk = k.toLowerCase();
    if (lk.indexOf("location") !== -1) {
      const val = nv[k] && nv[k][0] ? nv[k][0] : "";
      if (val && val.toString().trim().length) return val;
    }
  }
  // 3) fallback using generic find
  const fallback = findKeyGeneric(keys, ["location","choose location"]);
  return fallback ? (nv[fallback][0]||"") : "";
}

function resolveEquipment(keys, nv) {
  const found = [];
  for (const k of keys) {
    const lk = k.toLowerCase();
    if (lk.indexOf("equipment") !== -1 || lk.indexOf("equipments") !== -1) {
      const v = nv[k];
      if (!v) continue;
      found.push(Array.isArray(v) ? v.join(", ") : (v[0]||""));
    }
  }
  if (found.length) return found.join(", ");
  const key = findKeyGeneric(keys, ["equipment","equipments","equipment type"]);
  return key ? (Array.isArray(nv[key]) ? nv[key].join(", ") : (nv[key][0]||"")) : "";
}

function findKeyGeneric(keys, patterns) {
  patterns = Array.isArray(patterns) ? patterns : [patterns];
  const lk = keys.map(k=>({raw:k, lower:k.toLowerCase()}));
  for (const p of patterns) {
    const pp = p.toLowerCase();
    for (const it of lk) if (it.lower === pp) return it.raw;
  }
  for (const p of patterns) {
    const pp = p.toLowerCase();
    for (const it of lk) if (it.lower.indexOf(pp) !== -1) return it.raw;
  }
  return null;
}

function splitEquipment(raw) {
  if (!raw) return [];
  return raw.toString().split(/[,;\/\n\&]|(?:\band\b)/i).map(x=>x.trim()).filter(Boolean);
}

function makeEvidenceLink(raw) {
  if (!raw) return "";
  const candidate = Array.isArray(raw) ? raw[0] : String(raw);
  if (!candidate) return "";
  if (candidate.indexOf("http") === 0) return candidate;
  const match = candidate.match(/[-\w]{25,}/);
  if (match) {
    const fileId = match[0];
    try {
      const f = DriveApp.getFileById(fileId);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return f.getUrl();
    } catch (e) {
      return candidate;
    }
  }
  return candidate;
}
"} and dude i have also attached the Equipments1.png and Equipments2.png which is the screenshot of the Equipments sheet dude check out 










FOR NOW PA AND CCTV IS TO BE CONTINUED IN FUTURE AND I WILL UPDATE YOU FURTHER 