/* ============================================
   BACKUP MODULE — Full JSON Export/Import
   For computer migration
   ============================================ */
const Backup = (() => {

    async function exportAll() {
        try {
            Utils.showToast('Memproses export...', 'info');
            const data = await DB.exportAll();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const filename = `kesehatan_backup_${Utils.todayStr()}.json`;
            Utils.downloadFile(blob, filename);
            Utils.showToast('Backup berhasil di-export!', 'success');
            DB.addLog('Backup', `Exported all data to ${filename}`);
        } catch (err) {
            console.error('Backup export error:', err);
            Utils.showToast('Gagal export backup: ' + err.message, 'error');
        }
    }

    async function importAll(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!data._version) {
                Utils.showToast('File backup tidak valid', 'error');
                return;
            }
            if (!confirm('Import akan MENGGANTI semua data lokal. Lanjutkan?')) return;
            Utils.showToast('Memproses import...', 'info');
            await DB.importAll(data);
            Utils.showToast('Data berhasil di-import! Halaman akan di-refresh.', 'success');
            DB.addLog('Backup', `Imported backup from ${file.name}`);
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            console.error('Backup import error:', err);
            Utils.showToast('Gagal import backup: ' + err.message, 'error');
        }
    }

    // --- Export all data to Excel (multiple sheets) ---
    async function exportExcel() {
        try {
            Utils.showToast('Memproses export Excel...', 'info');
            const data = await DB.exportAll();
            const wb = XLSX.utils.book_new();
            const stores = ['treatment', 'moving', 'pengambilan_obat', 'penambahan_obat', 'pen_trial', 'salvage', 'master_data'];
            for (const store of stores) {
                if (data[store] && data[store].length > 0) {
                    // Remove photo data from Excel (too large)
                    const cleaned = data[store].map(row => {
                        const r = { ...row };
                        delete r.foto;
                        // Flatten obat items for treatment
                        if (r.items) { r.items_json = JSON.stringify(r.items); delete r.items; }
                        return r;
                    });
                    const ws = XLSX.utils.json_to_sheet(cleaned);
                    XLSX.utils.book_append_sheet(wb, ws, store);
                }
            }
            const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const filename = `kesehatan_data_${Utils.todayStr()}.xlsx`;
            Utils.downloadFile(blob, filename);
            Utils.showToast('Export Excel berhasil!', 'success');
        } catch (err) {
            console.error('Excel export error:', err);
            Utils.showToast('Gagal export Excel: ' + err.message, 'error');
        }
    }

    return { exportAll, importAll, exportExcel };
})();
