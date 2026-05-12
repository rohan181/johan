// Paste this entire file into Extensions → Apps Script in your Google Sheet.
// Then deploy as a Web App:
//   Execute as: Me
//   Who has access: Anyone
// Copy the Web App URL into APPS_SCRIPT_URL in your .env.local file.

var SHEET_ID = "1ThpyRBzZHlKDntoO2i32g5IJmQ3Mhk7LtL_mGRnr3Jk";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheets = ss.getSheets();
    var sheet = null;
    for (var i = 0; i < sheets.length; i++) {
      if (String(sheets[i].getSheetId()) === String(data.gid)) {
        sheet = sheets[i];
        break;
      }
    }

    if (!sheet) {
      return respond({ error: "Sheet with gid " + data.gid + " not found" });
    }

    // Find the GRAND TOTAL row in column B
    var lastRow = sheet.getLastRow();
    var colB = sheet.getRange(1, 2, lastRow, 1).getValues();
    var insertRow = lastRow + 1; // default: append after last row
    for (var r = 0; r < colB.length; r++) {
      if (/total/i.test(String(colB[r][0]))) {
        insertRow = r + 1; // 1-based row number
        break;
      }
    }

    // Insert a blank row before GRAND TOTAL (or at end)
    sheet.insertRowBefore(insertRow);

    // Write the new entry into A–G of the inserted row
    sheet.getRange(insertRow, 1, 1, 7).setValues([[
      data.date,
      data.tenantName,
      data.startDate,
      data.endDate,
      data.amount,
      data.paymentAmount || "",
      data.paymentDate || ""
    ]]);

    return respond({ ok: true });
  } catch (err) {
    return respond({ error: err.message });
  }
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
