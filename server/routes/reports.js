const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Attendance = require('../models/Attendance');
const Break = require('../models/Break');
const User = require('../models/User');
const { jwtRequired } = require('../middleware/auth');

const router = express.Router();

function currentMonth() {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const now = new Date(Date.now() + IST_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`;
}

/** Extract HH:MM time portion from "YYYY-MM-DD HH:MM:SS" string */
function parseTime(str) {
  if (!str || str === 'N/A') return 'N/A';
  return str.includes(' ') ? str.split(' ')[1].slice(0, 5) : str;
}

// ─────────────────────────────────────────────
//  ADMIN: Fetch all employees' records for a month
// ─────────────────────────────────────────────
async function fetchAdminRecords(month, department) {
  const atts = await Attendance.find({ date: { $regex: `^${month}` } }).sort({ date: 1 });
  const userIds = [...new Set(atts.map((a) => a.user_id.toString()))];
  const users = await User.find({ _id: { $in: userIds } });
  const userMap = {};
  users.forEach((u) => { userMap[u._id.toString()] = u; });

  const records = [];
  for (const a of atts) {
    const u = userMap[a.user_id.toString()];
    if (!u) continue;
    if (department && u.department !== department) continue;
    const break_count = await Break.countDocuments({ attendance_id: a._id });
    records.push({
      date: a.date,
      employee_id: u.employee_id,
      user_name: u.name,
      department: u.department,
      designation: u.designation,
      check_in: parseTime(a.check_in),
      check_out: parseTime(a.check_out),
      total_hours: a.total_hours ?? 0,
      break_duration_mins: a.break_duration_mins ?? 0,
      break_count,
      net_hours: a.net_hours ?? 0,
      status: a.status,
      is_late: a.is_late === 1 ? 'Yes' : 'No'
    });
  }

  records.sort((a, b) => {
    if (a.date === b.date) return a.employee_id.localeCompare(b.employee_id);
    return a.date.localeCompare(b.date);
  });

  return records;
}

// ─────────────────────────────────────────────
//  EMPLOYEE: Fetch own records for a month
// ─────────────────────────────────────────────
async function fetchEmployeeRecords(userId, month) {
  const atts = await Attendance.find({
    user_id: userId,
    date: { $regex: `^${month}` }
  }).sort({ date: 1 });

  const records = [];
  for (const a of atts) {
    const break_count = await Break.countDocuments({ attendance_id: a._id });
    records.push({
      date: a.date,
      check_in: parseTime(a.check_in),
      check_out: parseTime(a.check_out),
      total_hours: a.total_hours ?? 0,
      break_duration_mins: a.break_duration_mins ?? 0,
      break_count,
      net_hours: a.net_hours ?? 0,
      status: a.status,
      is_late: a.is_late === 1 ? 'Yes' : 'No'
    });
  }
  return records;
}

// ─────────────────────────────────────────────
//  Shared Excel builder helpers
// ─────────────────────────────────────────────
function styleHeaderRow(row) {
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF4F46E5' } },
      bottom: { style: 'thin', color: { argb: 'FF4F46E5' } }
    };
  });
}

function styleSummaryRow(row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F2937' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
}

function styleDataRow(row, rowIdx) {
  const bg = rowIdx % 2 === 0 ? 'FFF8F9FF' : 'FFFFFFFF';
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: 'Calibri', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
}

function autoFitColumns(ws) {
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len + 3 > max) max = len + 3;
    });
    col.width = max;
  });
}

// ─────────────────────────────────────────────
//  Shared PDF builder helpers
// ─────────────────────────────────────────────
function buildPdfTable(doc, records, colWidths, headers, rowMapper) {
  const startX = 30;
  let y = doc.y + 4;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);

  const drawRow = (cols, isHeader = false, isSummary = false) => {
    const rowH = isHeader ? 20 : 17;
    if (isHeader) {
      doc.rect(startX, y, totalWidth, rowH).fill('#4F46E5');
    } else if (isSummary) {
      doc.rect(startX, y, totalWidth, rowH).fill('#EEF2FF');
    }
    cols.forEach((text, i) => {
      doc
        .fontSize(isHeader ? 9 : isSummary ? 8.5 : 8)
        .fillColor(isHeader ? '#FFFFFF' : isSummary ? '#1F2937' : '#374151')
        .text(String(text ?? ''), startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 2, y + (rowH - 10) / 2 + 2, {
          width: colWidths[i] - 4,
          align: 'center',
          ellipsis: true,
          lineBreak: false
        });
    });
    y += rowH;
    if (y > 790) {
      doc.addPage();
      y = 30;
    }
  };

  drawRow(headers, true);
  records.forEach((r, idx) => {
    // Alternate row shading
    if (idx % 2 === 1) {
      doc.rect(startX, y, totalWidth, 17).fill('#F9FAFB');
    }
    drawRow(rowMapper(r));
  });

  return y;
}

// ═══════════════════════════════════════════════════════════
//  ADMIN ROUTES — /api/admin/export/excel  &  /pdf
// ═══════════════════════════════════════════════════════════

router.get('/excel', jwtRequired('admin'), async (req, res) => {
  try {
    const month = (req.query.month || currentMonth()).trim();
    const department = (req.query.department || '').trim();
    const records = await fetchAdminRecords(month, department);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Attendance Management System';
    wb.created = new Date();
    const ws = wb.addWorksheet(`Attendance_${month}`);

    // Title row
    ws.mergeCells('A1:L1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `📋  Office Attendance Report — ${month}${department ? `  |  Dept: ${department}` : ''}`;
    titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF4F46E5' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(1).height = 40;

    // Meta row
    ws.mergeCells('A2:L2');
    ws.getCell('A2').value = `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}  |  Total Records: ${records.length}`;
    ws.getCell('A2').font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
    ws.getRow(2).height = 18;

    ws.addRow([]); // spacer

    const headers = [
      'Date', 'Emp ID', 'Employee Name', 'Department', 'Designation',
      'Check In', 'Check Out', 'Total Hrs', 'Break (Mins)', 'Net Hrs', 'Status', 'Late?'
    ];
    const headerRow = ws.addRow(headers);
    styleHeaderRow(headerRow);

    records.forEach((r, idx) => {
      const dataRow = ws.addRow([
        r.date, r.employee_id, r.user_name, r.department, r.designation,
        r.check_in, r.check_out, r.total_hours, r.break_duration_mins,
        r.net_hours, r.status, r.is_late
      ]);
      styleDataRow(dataRow, idx);
    });

    // Summary row
    if (records.length > 0) {
      ws.addRow([]);
      const totalNet = records.reduce((s, r) => s + (parseFloat(r.net_hours) || 0), 0);
      const totalBreak = records.reduce((s, r) => s + (parseInt(r.break_duration_mins) || 0), 0);
      const presentCount = records.filter((r) => ['Present', 'Late'].includes(r.status)).length;
      const lateCount = records.filter((r) => r.is_late === 'Yes').length;
      const sumRow = ws.addRow([
        'TOTALS', '', `${records.length} records`, '', '',
        '', '', '', `${totalBreak} mins`, `${totalNet.toFixed(2)} hrs`,
        `Present: ${presentCount}`, `Late: ${lateCount}`
      ]);
      styleSummaryRow(sumRow);
    }

    autoFitColumns(ws);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Attendance_Report_${month}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Excel export failed' });
  }
});

router.get('/pdf', jwtRequired('admin'), async (req, res) => {
  try {
    const month = (req.query.month || currentMonth()).trim();
    const department = (req.query.department || '').trim();
    const records = await fetchAdminRecords(month, department);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Attendance_Summary_${month}.pdf`);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 25 });
    doc.pipe(res);

    // Header
    doc.fontSize(18).fillColor('#4F46E5').text(`Office Attendance Report`, { align: 'left' });
    doc.fontSize(11).fillColor('#374151').text(`Period: ${month}${department ? `  |  Department: ${department}` : ''}  |  Records: ${records.length}`);
    doc.fontSize(8).fillColor('#94A3B8').text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    doc.moveDown(0.8);

    const colWidths = [60, 50, 110, 90, 60, 60, 50, 60, 55];
    const headers = ['Date', 'Emp ID', 'Name', 'Department', 'Check In', 'Check Out', 'Net Hrs', 'Status', 'Late?'];

    buildPdfTable(doc, records, colWidths, headers, (r) => [
      r.date, r.employee_id, r.user_name, r.department,
      r.check_in, r.check_out, `${r.net_hours}h`, r.status, r.is_late
    ]);

    // Footer summary
    if (records.length > 0) {
      doc.moveDown(1.2);
      const totalNet = records.reduce((s, r) => s + (parseFloat(r.net_hours) || 0), 0);
      const totalBreak = records.reduce((s, r) => s + (parseInt(r.break_duration_mins) || 0), 0);
      const presentCount = records.filter((r) => ['Present', 'Late'].includes(r.status)).length;
      const lateCount = records.filter((r) => r.is_late === 'Yes').length;
      doc.fontSize(9).fillColor('#4F46E5').text(
        `Summary — Total Net Hours: ${totalNet.toFixed(2)}h  |  Total Break: ${totalBreak} mins  |  Present Days: ${presentCount}  |  Late: ${lateCount}`,
        { align: 'center' }
      );
    }

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) return res.status(500).json({ error: 'PDF export failed' });
  }
});

// ═══════════════════════════════════════════════════════════
//  EMPLOYEE SELF-EXPORT ROUTES
//  GET /api/employee/export/excel  &  /pdf
//  Mounted at /api/employee/export in index.js
// ═══════════════════════════════════════════════════════════

router.get('/employee-excel', jwtRequired('employee'), async (req, res) => {
  try {
    const month = (req.query.month || currentMonth()).trim();
    const userId = req.currentUser.id;
    const user = await User.findById(userId).select('name employee_id department designation');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const records = await fetchEmployeeRecords(userId, month);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Attendance Management System';
    wb.created = new Date();
    const ws = wb.addWorksheet(`My_Attendance_${month}`);

    // Title
    ws.mergeCells('A1:J1');
    ws.getCell('A1').value = `📋  My Attendance Report — ${month}`;
    ws.getCell('A1').font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF4F46E5' } };
    ws.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(1).height = 40;

    ws.mergeCells('A2:J2');
    ws.getCell('A2').value = `Employee: ${user.name}  (${user.employee_id})  |  Dept: ${user.department}  |  Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
    ws.getCell('A2').font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
    ws.getRow(2).height = 18;

    ws.addRow([]);

    const headers = ['Date', 'Check In', 'Check Out', 'Total Hrs', 'Break (Mins)', 'No. Breaks', 'Net Hrs', 'Status', 'Late?'];
    const headerRow = ws.addRow(headers);
    styleHeaderRow(headerRow);

    records.forEach((r, idx) => {
      const dataRow = ws.addRow([
        r.date, r.check_in, r.check_out,
        r.total_hours, r.break_duration_mins, r.break_count,
        r.net_hours, r.status, r.is_late
      ]);
      styleDataRow(dataRow, idx);
    });

    // Summary row
    if (records.length > 0) {
      ws.addRow([]);
      const totalNet = records.reduce((s, r) => s + (parseFloat(r.net_hours) || 0), 0);
      const totalBreak = records.reduce((s, r) => s + (parseInt(r.break_duration_mins) || 0), 0);
      const presentDays = records.filter((r) => ['Present', 'Late'].includes(r.status)).length;
      const lateDays = records.filter((r) => r.is_late === 'Yes').length;
      const sumRow = ws.addRow([
        'TOTALS', '', '', '', `${totalBreak} mins`, '',
        `${totalNet.toFixed(2)} hrs`, `Present: ${presentDays}`, `Late: ${lateDays}`
      ]);
      styleSummaryRow(sumRow);
    }

    autoFitColumns(ws);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=My_Attendance_${user.employee_id}_${month}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Excel export failed' });
  }
});

router.get('/employee-pdf', jwtRequired('employee'), async (req, res) => {
  try {
    const month = (req.query.month || currentMonth()).trim();
    const userId = req.currentUser.id;
    const user = await User.findById(userId).select('name employee_id department designation');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const records = await fetchEmployeeRecords(userId, month);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=My_Attendance_${user.employee_id}_${month}.pdf`);

    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    doc.pipe(res);

    // Header
    doc.fontSize(18).fillColor('#4F46E5').text(`My Attendance Report`, { align: 'left' });
    doc.fontSize(11).fillColor('#374151').text(`Employee: ${user.name}  (${user.employee_id})  |  Department: ${user.department}`);
    doc.text(`Period: ${month}  |  Total Records: ${records.length}`);
    doc.fontSize(8).fillColor('#94A3B8').text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    doc.moveDown(0.8);

    const colWidths = [65, 60, 60, 55, 70, 55, 55, 65, 50];
    const headers = ['Date', 'Check In', 'Check Out', 'Total Hrs', 'Break (Mins)', 'Breaks', 'Net Hrs', 'Status', 'Late?'];

    buildPdfTable(doc, records, colWidths, headers, (r) => [
      r.date, r.check_in, r.check_out,
      `${r.total_hours}h`, `${r.break_duration_mins} mins`, r.break_count,
      `${r.net_hours}h`, r.status, r.is_late
    ]);

    // Summary footer
    if (records.length > 0) {
      doc.moveDown(1.2);
      const totalNet = records.reduce((s, r) => s + (parseFloat(r.net_hours) || 0), 0);
      const totalBreak = records.reduce((s, r) => s + (parseInt(r.break_duration_mins) || 0), 0);
      const presentDays = records.filter((r) => ['Present', 'Late'].includes(r.status)).length;
      const lateDays = records.filter((r) => r.is_late === 'Yes').length;
      const halfDays = records.filter((r) => r.status === 'Half Day').length;
      doc.fontSize(9).fillColor('#4F46E5').text(
        `Summary — Net Hours: ${totalNet.toFixed(2)}h  |  Break: ${totalBreak} mins  |  Present: ${presentDays}  |  Late: ${lateDays}  |  Half Day: ${halfDays}`,
        { align: 'center' }
      );
    }

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) return res.status(500).json({ error: 'PDF export failed' });
  }
});

module.exports = router;
