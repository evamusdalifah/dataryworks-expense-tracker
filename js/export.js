// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - EXPORT UTILITIES (PDF & CSV)
// ==============================================================================

export function exportToPDF(state) {
  const element = document.getElementById('main-view-content');
  if (!element) return;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[state.selectedMonth - 1] || 'May';

  const opt = {
    margin: 10,
    filename: `DataryWorks_Financial_Report_${monthName}_${state.selectedYear}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  if (window.html2pdf) {
    window.html2pdf().set(opt).from(element).save();
  } else {
    window.print();
  }
}

export function exportToCSV(state) {
  const transactions = state.transactions;
  if (transactions.length === 0) {
    alert('Tidak ada transaksi untuk diekspor.');
    return;
  }

  const headers = ['ID', 'Tanggal', 'Item', 'Tipe', 'Kategori', 'Subkategori', 'Nominal (Rp)', 'Metode Pembayaran', 'Catatan'];
  const rows = transactions.map(t => [
    `"${t.id}"`,
    `"${t.date}"`,
    `"${t.item.replace(/"/g, '""')}"`,
    `"${t.type}"`,
    `"${t.category}"`,
    `"${t.subcategory || '-'}"`,
    t.amount,
    `"${t.paymentMethod || 'Cash'}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `DataryWorks_Transactions_${state.selectedYear}_M${state.selectedMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
