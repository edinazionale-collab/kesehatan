/* ============================================
   PENGAMBILAN OBAT MODULE — Medicine Pickup (Invoice style)
   ============================================ */
const PengambilanObat = (() => {
    const DEFAULT_OBAT = [
        'Limoxin LA 100ml', 'Vitol 100ml', 'B-Plex 100ml', 'Biodin 100ml',
        'Penstrep 100ml', 'Calcidex 100ml', 'Sulpidon 100ml', 'Intertrim 100ml',
        'Glucortin 50ml', 'Permethyl 25ml', 'Intermectin 50ml', 'Banixin 50ml',
        'Jarum Vaksin', 'Pisau Bedah', 'Vitamin', 'Gunasex Spray',
        'Trial', 'Vaksin PMK', 'Vaksin LSD', 'Tolfedine 50ml',
        'Vaksin LSD Lumpyvax', 'Vaksin PMK 25 Dosis', 'LSD Collection',
        'Vaksin LSD Kemin 25 Dosis'
    ];

    let lineItems = [];

    async function initDefaults() {
        const existing = await DB.getMasterByType('obatList');
        if (existing.length === 0) {
            for (const v of DEFAULT_OBAT) await DB.addMaster('obatList', v);
        }
    }

    async function populateDropdowns() {
        await Utils.populateSelect('pobjPJ', 'penanggungJawab', '-- Pilih PJ --');
    }

    async function populateObatSelect(selectEl) {
        const items = await DB.getMasterByType('obatList');
        selectEl.innerHTML = '<option value="">-- Pilih Obat --</option>';
        items.forEach(v => { selectEl.innerHTML += `<option value="${v}">${v}</option>`; });
    }

    async function init() {
        await initDefaults();
        await populateDropdowns();
        document.getElementById('pobjTanggal').value = Utils.todayStr();
        lineItems = [];
        await addLine();
        await refreshTable();
    }

    async function addLine() {
        const container = document.getElementById('pobjLines');
        const idx = container.children.length;
        const row = document.createElement('div');
        row.className = 'invoice-line';
        row.innerHTML = `
            <div class="line-num">${idx + 1}</div>
            <div class="line-obat">
                <select class="form-control pobj-obat-select" data-idx="${idx}">
                    <option value="">-- Pilih Obat --</option>
                </select>
            </div>
            <div class="line-qty">
                <input type="number" class="form-control pobj-qty-input" data-idx="${idx}" placeholder="Jumlah" min="0" step="1">
            </div>
            <div class="line-action">
                <button class="btn-icon btn-danger" onclick="PengambilanObat.removeLine(this)" title="Hapus baris">✕</button>
            </div>
        `;
        container.appendChild(row);
        await populateObatSelect(row.querySelector('.pobj-obat-select'));
    }

    function removeLine(btn) {
        const line = btn.closest('.invoice-line');
        line.remove();
        // Re-number
        document.querySelectorAll('#pobjLines .invoice-line').forEach((row, i) => {
            row.querySelector('.line-num').textContent = i + 1;
        });
    }

    function getLineItems() {
        const items = [];
        document.querySelectorAll('#pobjLines .invoice-line').forEach(row => {
            const obat = row.querySelector('.pobj-obat-select').value;
            const qty = parseInt(row.querySelector('.pobj-qty-input').value) || 0;
            if (obat && qty > 0) items.push({ obat, qty });
        });
        return items;
    }

    async function saveData() {
        const items = getLineItems();
        if (items.length === 0) { Utils.showToast('Tambahkan minimal 1 obat', 'warning'); return; }

        const data = {
            tanggal: document.getElementById('pobjTanggal').value,
            penanggungJawab: document.getElementById('pobjPJ').value,
            items: items,
            createdAt: new Date().toISOString()
        };

        try {
            await DB.add('pengambilan_obat', data);
            Utils.showToast('Data pengambilan obat berhasil disimpan!', 'success');
            clearForm();
            await refreshTable();
        } catch (err) {
            console.error('Save pengambilan obat error:', err);
            Utils.showToast('Gagal menyimpan: ' + err.message, 'error');
        }
    }

    async function clearForm() {
        document.getElementById('pobjTanggal').value = Utils.todayStr();
        const pj = document.getElementById('pobjPJ');
        if (pj) pj.selectedIndex = 0;
        document.getElementById('pobjLines').innerHTML = '';
        await addLine();
    }

    async function refreshTable() {
        const data = await DB.getAll('pengambilan_obat');
        const tbody = document.getElementById('pobjTableBody');
        if (!tbody) return;
        data.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.id - a.id));
        tbody.innerHTML = data.map((r, i) => {
            const itemsHtml = (r.items || []).map(it => `${it.obat}: <strong>${it.qty}</strong>`).join('<br>');
            return `
                <tr>
                    <td>${data.length - i}</td>
                    <td>${Utils.formatDate(r.tanggal)}</td>
                    <td>${r.penanggungJawab || '-'}</td>
                    <td class="items-cell">${itemsHtml}</td>
                    <td>
                        <button class="btn-icon btn-danger" onclick="PengambilanObat.deleteRecord(${r.id})" title="Hapus">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function deleteRecord(id) {
        if (!confirm('Hapus data pengambilan obat ini?')) return;
        await DB.remove('pengambilan_obat', id);
        Utils.showToast('Data dihapus', 'info');
        await refreshTable();
    }

    async function exportExcel() {
        const data = await DB.getAll('pengambilan_obat');
        const rows = [];
        data.forEach(r => {
            (r.items || []).forEach(it => {
                rows.push({
                    Tanggal: Utils.formatDate(r.tanggal),
                    'Penanggung Jawab': r.penanggungJawab,
                    Obat: it.obat,
                    Jumlah: it.qty
                });
            });
        });
        Utils.exportToExcel(rows, `pengambilan_obat_${Utils.todayStr()}.xlsx`, 'Pengambilan Obat');
    }

    return { init, saveData, clearForm, addLine, removeLine, refreshTable, deleteRecord, exportExcel, populateDropdowns };
})();
