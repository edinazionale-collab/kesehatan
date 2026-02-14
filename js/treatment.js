/* ============================================
   TREATMENT MODULE
   ============================================ */
const Treatment = (() => {
    // --- Default master data ---
    const DEFAULTS = {
        diagnosa: ['Pincang', 'Kalah Makan', 'Tidak Mau Makan', 'Kurus', 'Gangguan Pencernaan', 'Asidosis', 'Gangguan Pernafasan'],
        penAkhir: ['Hospital 1', 'Hospital 2', 'Hospital 3', 'Hospital 108', 'Hospital 109', 'Drafting 1', 'Drafting 2', 'Drafting 3'],
        antiBiotik: ['Limoxin-200 LA', 'Intertrim LA', 'Procaben LA'],
        antiInflamasi: ['Glucortin', 'Banixin', 'Tolfedin'],
        analgesik: ['Sulpidon'],
        supportive: ['Bplex', 'Biodin', 'Fertilife', 'Calcidex'],
        antiParasitic: ['Intermectin'],
        antiBloat: ['Petricone']
    };

    async function initDefaults() {
        for (const [type, values] of Object.entries(DEFAULTS)) {
            const existing = await DB.getMasterByType(type);
            if (existing.length === 0) {
                for (const v of values) {
                    await DB.addMaster(type, v);
                }
            }
        }
    }

    async function populateDropdowns() {
        await Utils.populateSelect('treatShipment', 'shipment', '-- Pilih Shipment --');
        await Utils.populateSelect('treatPJ', 'penanggungJawab', '-- Pilih PJ --');
        await Utils.populateSelect('treatJenisPakan', 'jenisPakan', '-- Pilih Jenis Pakan --');
        await Utils.populateSelect('treatDiagnosa', 'diagnosa', '-- Pilih Diagnosa --');
        await Utils.populateSelect('treatPenAkhir', 'penAkhir', '-- Pilih Pen --');
        await Utils.populateSelect('treatAntiBiotik', 'antiBiotik', '-- Pilih --');
        await Utils.populateSelect('treatAntiInflamasi', 'antiInflamasi', '-- Pilih --');
        await Utils.populateSelect('treatAnalgesik', 'analgesik', '-- Pilih --');
        await Utils.populateSelect('treatSupportive1', 'supportive', '-- Pilih --');
        await Utils.populateSelect('treatSupportive2', 'supportive', '-- Pilih --');
        await Utils.populateSelect('treatSupportive3', 'supportive', '-- Pilih --');
        await Utils.populateSelect('treatAntiParasitic', 'antiParasitic', '-- Pilih --');
        await Utils.populateSelect('treatAntiBloat', 'antiBloat', '-- Pilih --');
    }

    async function init() {
        await initDefaults();
        await populateDropdowns();
        document.getElementById('treatTanggal').value = Utils.todayStr();
        await refreshTable();
    }

    async function saveData() {
        const eartag = document.getElementById('treatEartag').value.trim();
        if (!eartag) { Utils.showToast('Eartag harus diisi', 'warning'); return; }

        let foto = null;
        const fotoInput = document.getElementById('treatFoto');
        if (fotoInput.files.length > 0) {
            try { foto = await Utils.imageToBase64(fotoInput.files[0]); } catch (e) { console.warn('Photo error:', e); }
        }

        const data = {
            tanggal: document.getElementById('treatTanggal').value,
            penanggungJawab: document.getElementById('treatPJ').value,
            shipment: document.getElementById('treatShipment').value,
            eartag: eartag,
            berat: parseFloat(document.getElementById('treatBerat').value) || 0,
            jenisPakan: document.getElementById('treatJenisPakan').value,
            treatmentKe: parseInt(document.getElementById('treatKe').value) || 1,
            diagnosa: document.getElementById('treatDiagnosa').value,
            penAsal: document.getElementById('treatPenAsal').value.trim(),
            penAkhir: document.getElementById('treatPenAkhir').value,
            antiBiotik: document.getElementById('treatAntiBiotik').value,
            antiBiotikDosis: document.getElementById('treatAntiBiotikDosis').value.trim(),
            antiInflamasi: document.getElementById('treatAntiInflamasi').value,
            antiInflamasiDosis: document.getElementById('treatAntiInflamasiDosis').value.trim(),
            analgesik: document.getElementById('treatAnalgesik').value,
            analgesikDosis: document.getElementById('treatAnalgesikDosis').value.trim(),
            supportive1: document.getElementById('treatSupportive1').value,
            supportive1Dosis: document.getElementById('treatSupportive1Dosis').value.trim(),
            supportive2: document.getElementById('treatSupportive2').value,
            supportive2Dosis: document.getElementById('treatSupportive2Dosis').value.trim(),
            supportive3: document.getElementById('treatSupportive3').value,
            supportive3Dosis: document.getElementById('treatSupportive3Dosis').value.trim(),
            antiParasitic: document.getElementById('treatAntiParasitic').value,
            antiParasiticDosis: document.getElementById('treatAntiParasiticDosis').value.trim(),
            antiBloat: document.getElementById('treatAntiBloat').value,
            antiBloatDosis: document.getElementById('treatAntiBloatDosis').value.trim(),
            treatmentLainnya: document.getElementById('treatLainnya').value.trim(),
            foto: foto,
            kondisi: 'Dirawat',
            createdAt: new Date().toISOString()
        };

        try {
            await DB.add('treatment', data);
            Utils.showToast('Data treatment berhasil disimpan!', 'success');
            clearForm();
            await refreshTable();
        } catch (err) {
            console.error('Save treatment error:', err);
            Utils.showToast('Gagal menyimpan: ' + err.message, 'error');
        }
    }

    function clearForm() {
        document.getElementById('treatTanggal').value = Utils.todayStr();
        document.getElementById('treatEartag').value = '';
        document.getElementById('treatBerat').value = '';
        document.getElementById('treatPenAsal').value = '';
        document.getElementById('treatKe').value = '1';
        document.getElementById('treatLainnya').value = '';
        document.getElementById('treatFoto').value = '';
        // Reset dosis fields
        document.querySelectorAll('.dosis-input').forEach(el => el.value = '');
        // Reset selects to default
        ['treatPJ', 'treatShipment', 'treatJenisPakan', 'treatDiagnosa', 'treatPenAkhir',
            'treatAntiBiotik', 'treatAntiInflamasi', 'treatAnalgesik',
            'treatSupportive1', 'treatSupportive2', 'treatSupportive3',
            'treatAntiParasitic', 'treatAntiBloat'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.selectedIndex = 0;
            });
    }

    async function refreshTable() {
        const data = await DB.getAll('treatment');
        const tbody = document.getElementById('treatTableBody');
        if (!tbody) return;
        data.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.id - a.id));
        tbody.innerHTML = data.map((r, i) => `
            <tr>
                <td>${data.length - i}</td>
                <td>${Utils.formatDate(r.tanggal)}</td>
                <td>${r.penanggungJawab || '-'}</td>
                <td>${r.shipment || '-'}</td>
                <td><strong>${r.eartag}</strong></td>
                <td>${r.berat || '-'}</td>
                <td>${r.jenisPakan || '-'}</td>
                <td>${r.treatmentKe || '-'}</td>
                <td>${r.diagnosa || '-'}</td>
                <td>${r.penAsal || '-'}</td>
                <td>${r.penAkhir || '-'}</td>
                <td class="obat-cell">
                    ${r.antiBiotik ? `<span class="obat-tag ab">${r.antiBiotik} ${r.antiBiotikDosis || ''}</span>` : ''}
                    ${r.antiInflamasi ? `<span class="obat-tag ai">${r.antiInflamasi} ${r.antiInflamasiDosis || ''}</span>` : ''}
                    ${r.analgesik ? `<span class="obat-tag an">${r.analgesik} ${r.analgesikDosis || ''}</span>` : ''}
                    ${r.supportive1 ? `<span class="obat-tag sp">${r.supportive1} ${r.supportive1Dosis || ''}</span>` : ''}
                    ${r.supportive2 ? `<span class="obat-tag sp">${r.supportive2} ${r.supportive2Dosis || ''}</span>` : ''}
                    ${r.supportive3 ? `<span class="obat-tag sp">${r.supportive3} ${r.supportive3Dosis || ''}</span>` : ''}
                    ${r.antiParasitic ? `<span class="obat-tag ap">${r.antiParasitic} ${r.antiParasiticDosis || ''}</span>` : ''}
                    ${r.antiBloat ? `<span class="obat-tag bl">${r.antiBloat} ${r.antiBloatDosis || ''}</span>` : ''}
                    ${r.treatmentLainnya ? `<span class="obat-tag ot">${r.treatmentLainnya}</span>` : ''}
                </td>
                <td>${r.foto ? '<span class="has-photo" onclick="Treatment.viewPhoto(' + r.id + ')">📷</span>' : '-'}</td>
                <td>
                    <button class="btn-icon btn-danger" onclick="Treatment.deleteRecord(${r.id})" title="Hapus">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    async function deleteRecord(id) {
        if (!confirm('Hapus data treatment ini?')) return;
        await DB.remove('treatment', id);
        Utils.showToast('Data dihapus', 'info');
        await refreshTable();
    }

    async function viewPhoto(id) {
        const record = await DB.get('treatment', id);
        if (record && record.foto) {
            const modal = document.getElementById('modalPhoto');
            document.getElementById('modalPhotoImg').src = record.foto;
            Utils.openModal('modalPhoto');
        }
    }

    async function exportExcel() {
        const data = await DB.getAll('treatment');
        const exported = data.map(r => ({
            Tanggal: Utils.formatDate(r.tanggal),
            'Penanggung Jawab': r.penanggungJawab,
            Shipment: r.shipment,
            Eartag: r.eartag,
            Berat: r.berat,
            'Jenis Pakan': r.jenisPakan,
            'Treatment Ke': r.treatmentKe,
            Diagnosa: r.diagnosa,
            'Pen Asal': r.penAsal,
            'Pen Akhir': r.penAkhir,
            'Anti Biotik': r.antiBiotik, 'AB Dosis': r.antiBiotikDosis,
            'Anti Inflamasi': r.antiInflamasi, 'AI Dosis': r.antiInflamasiDosis,
            Analgesik: r.analgesik, 'AN Dosis': r.analgesikDosis,
            'Supportive 1': r.supportive1, 'S1 Dosis': r.supportive1Dosis,
            'Supportive 2': r.supportive2, 'S2 Dosis': r.supportive2Dosis,
            'Supportive 3': r.supportive3, 'S3 Dosis': r.supportive3Dosis,
            'Anti Parasitic': r.antiParasitic, 'AP Dosis': r.antiParasiticDosis,
            'Anti Bloat': r.antiBloat, 'ABl Dosis': r.antiBloatDosis,
            'Treatment Lainnya': r.treatmentLainnya,
            Kondisi: r.kondisi
        }));
        Utils.exportToExcel(exported, `treatment_${Utils.todayStr()}.xlsx`, 'Treatment');
    }

    return { init, saveData, clearForm, refreshTable, deleteRecord, viewPhoto, exportExcel, populateDropdowns };
})();
