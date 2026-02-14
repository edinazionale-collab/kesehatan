/* ============================================
   MOVING MODULE — Pengambilan/Pengembalian Sapi
   ============================================ */
const Moving = (() => {
    const DEFAULTS = {
        keteranganMoving: ['Sembuh', 'Pemulihan', 'Urgent'],
    };

    async function initDefaults() {
        for (const [type, values] of Object.entries(DEFAULTS)) {
            const existing = await DB.getMasterByType(type);
            if (existing.length === 0) {
                for (const v of values) await DB.addMaster(type, v);
            }
        }
    }

    async function populateDropdowns() {
        await Utils.populateSelect('movPJ', 'penanggungJawab', '-- Pilih PJ --');
        await Utils.populateSelect('movShipment', 'shipment', '-- Pilih Shipment --');
        await Utils.populateSelect('movKeterangan', 'keteranganMoving', '-- Pilih Keterangan --');
        await Utils.populateSelect('movPenAkhir', 'penAkhir', '-- Pilih Pen --');
    }

    async function init() {
        await initDefaults();
        await populateDropdowns();
        document.getElementById('movTanggal').value = Utils.todayStr();
        await refreshTable();
    }

    async function saveData() {
        const eartag = document.getElementById('movEartag').value.trim();
        if (!eartag) { Utils.showToast('Eartag harus diisi', 'warning'); return; }

        let foto = null;
        const fotoInput = document.getElementById('movFoto');
        if (fotoInput.files.length > 0) {
            try { foto = await Utils.imageToBase64(fotoInput.files[0]); } catch (e) { console.warn('Photo error:', e); }
        }

        const isSalvage = document.getElementById('movSalvage').checked;

        const data = {
            tanggal: document.getElementById('movTanggal').value,
            penanggungJawab: document.getElementById('movPJ').value,
            shipment: document.getElementById('movShipment').value,
            eartag: eartag,
            keterangan: document.getElementById('movKeterangan').value,
            penAwal: document.getElementById('movPenAwal').value.trim(),
            penAkhir: document.getElementById('movPenAkhir').value,
            isSalvage: isSalvage,
            foto: foto,
            createdAt: new Date().toISOString()
        };

        try {
            await DB.add('moving', data);

            // If salvage, also add to salvage store
            if (isSalvage) {
                await DB.add('salvage', {
                    tanggal: data.tanggal,
                    eartag: data.eartag,
                    shipment: data.shipment,
                    penAwal: data.penAwal,
                    keterangan: 'Jual Salvage',
                    createdAt: new Date().toISOString()
                });
                Utils.showToast('Data moving + salvage berhasil disimpan!', 'success');
            } else {
                Utils.showToast('Data moving berhasil disimpan!', 'success');
            }

            clearForm();
            await refreshTable();
        } catch (err) {
            console.error('Save moving error:', err);
            Utils.showToast('Gagal menyimpan: ' + err.message, 'error');
        }
    }

    function clearForm() {
        document.getElementById('movTanggal').value = Utils.todayStr();
        document.getElementById('movEartag').value = '';
        document.getElementById('movPenAwal').value = '';
        document.getElementById('movSalvage').checked = false;
        document.getElementById('movFoto').value = '';
        ['movPJ', 'movShipment', 'movKeterangan', 'movPenAkhir'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.selectedIndex = 0;
        });
    }

    async function refreshTable() {
        const data = await DB.getAll('moving');
        const tbody = document.getElementById('movTableBody');
        if (!tbody) return;
        data.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.id - a.id));
        tbody.innerHTML = data.map((r, i) => `
            <tr class="${r.isSalvage ? 'salvage-row' : ''}">
                <td>${data.length - i}</td>
                <td>${Utils.formatDate(r.tanggal)}</td>
                <td>${r.penanggungJawab || '-'}</td>
                <td>${r.shipment || '-'}</td>
                <td><strong>${r.eartag}</strong></td>
                <td>${r.keterangan || '-'}</td>
                <td>${r.penAwal || '-'}</td>
                <td>${r.penAkhir || '-'}</td>
                <td>${r.isSalvage ? '✅ Salvage' : '-'}</td>
                <td>${r.foto ? '<span class="has-photo" onclick="Moving.viewPhoto(' + r.id + ')">📷</span>' : '-'}</td>
                <td>
                    <button class="btn-icon btn-danger" onclick="Moving.deleteRecord(${r.id})" title="Hapus">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    async function deleteRecord(id) {
        if (!confirm('Hapus data moving ini?')) return;
        await DB.remove('moving', id);
        Utils.showToast('Data dihapus', 'info');
        await refreshTable();
    }

    async function viewPhoto(id) {
        const record = await DB.get('moving', id);
        if (record && record.foto) {
            document.getElementById('modalPhotoImg').src = record.foto;
            Utils.openModal('modalPhoto');
        }
    }

    async function exportExcel() {
        const data = await DB.getAll('moving');
        const exported = data.map(r => ({
            Tanggal: Utils.formatDate(r.tanggal),
            'Penanggung Jawab': r.penanggungJawab,
            Shipment: r.shipment,
            Eartag: r.eartag,
            Keterangan: r.keterangan,
            'Pen Awal': r.penAwal,
            'Pen Akhir': r.penAkhir,
            Salvage: r.isSalvage ? 'Ya' : 'Tidak'
        }));
        Utils.exportToExcel(exported, `moving_${Utils.todayStr()}.xlsx`, 'Moving');
    }

    return { init, saveData, clearForm, refreshTable, deleteRecord, viewPhoto, exportExcel, populateDropdowns };
})();
