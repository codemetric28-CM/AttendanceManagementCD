const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { jwtRequired } = require('../middleware/auth');

const router = express.Router();

function currentMonth() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

async function fetchRecords(month, department) {
  const atts = await Attendance.find({ date: { $regex: `^${month}` } }).sort({
    date: 1
  });
  const userIds = [...new Set(atts.map((a) => a.user_id.toString()))];
  const users = await User.find({ _id: { $in: userIds } });
  const userMap = {};
  users.forEach((u) => {
    userMap[u._id.toString()] = u;
  });

  const records = [];
  for (const a of atts) {
    const u = userMap[a.user_id.toString()];
    if (!u) continue;
    if (department && u.department !== department) continue;
    records.push({
      date: a.date,
      employee_id: u.employee_id,
      user_name: u.name,
      department: u.department,
      designation: u.designation,
      check_in: a.check_in || 'N/A',
      check_out: a.check_out || 'N/A',
      total_hours: a.total_hours,
      break_duration_mins: a.break_duration_mins,
      net_hours: a.net_hours,
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

router.get('/excel', jwtRequired('admin'), async (req, res) => {
  try {
    const month = (req.query.month || currentMonth()).trim();
    const department = (req.query.department || '').trim();
    const records = await fetchRecords(month, department);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Attendance_${month}`);

    ws.mergeCells('A1:L1');
    ws.getCell('A1').value = `Office Attendance Report - ${month}`;
    ws.getCell('A1').font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF1F2937' } };
    ws.getRow(1).height = 35;

    ws.addRow([]);
    const headers = [
      'Date',
      'Emp ID',
      'Employee Name',
      'Department',
      'Designation',
      'Check In',
      'Check Out',
      'Total Hrs',
      'Break (Mins)',
      'Net Hrs',
      'Status',
      'Late?'
    ];
    const headerRow = ws.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    records.forEach((r) => {
      ws.addRow([
        r.date,
        r.employee_id,
        r.user_name,
        r.department,
        r.designation,
        r.check_in,
        r.check_out,
        r.total_hours,
        r.break_duration_mins,
        r.net_hours,
        r.status,
        r.is_late
      ]);
    });

    ws.columns.forEach((col) => {
      let max = 12;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const len = String(cell.value || '').length;
        if (len + 3 > max) max = len + 3;
      });
      col.width = max;
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Attendance_Report_${month}.xlsx`
    );

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
    let records = await fetchRecords(month, department);
    records = records.slice(0, 150);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Attendance_Summary_${month}.pdf`
    );

    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    doc.pipe(res);

    doc.fontSize(18).fillColor('#1F2937').text(`Office Attendance Report (${month})`, {
      align: 'left'
    });
    if (department) {
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000').text(`Department: ${department}`);
    }
    doc.moveDown(1);

    const colWidths = [65, 55, 100, 85, 60, 60, 50, 55];
    const headers = ['Date', 'Emp ID', 'Name', 'Department', 'Check In', 'Check Out', 'Net Hrs', 'Status'];
    const startX = 30;
    let y = doc.y;

    const drawRow = (cols, isHeader = false) => {
      let x = startX;
      const rowH = 18;
      if (isHeader) {
        doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowH).fill('#4F46E5');
      }
      cols.forEach((text, i) => {
        doc
          .fontSize(isHeader ? 9 : 8)
          .fillColor(isHeader ? '#FFFFFF' : '#000000')
          .text(String(text ?? ''), x + 2, y + 4, {
            width: colWidths[i] - 4,
            align: 'center',
            ellipsis: true
          });
        x += colWidths[i];
      });
      y += rowH;
      if (y > 780) {
        doc.addPage();
        y = 30;
      }
    };

    drawRow(headers, true);
    records.forEach((r) => {
      const cin = r.check_in.includes(' ') ? r.check_in.split(' ')[1] : r.check_in;
      const cout = r.check_out.includes(' ') ? r.check_out.split(' ')[1] : r.check_out;
      drawRow([
        r.date,
        r.employee_id,
        r.user_name,
        r.department,
        cin,
        cout,
        `${r.net_hours}h`,
        r.status
      ]);
    });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'PDF export failed' });
    }
  }
});

module.exports = router;
