/* ============================================
   PENAMBAHAN OBAT MODULE — Medicine Addition/Stock
   ============================================ */
const PenambahanObat = (() => {

    let lineItems = [];

    async function populateDropdowns() {
        await Utils.populateSelect('pambPJ', 'penanggungJawab', '-- Pilih PJ --');
    }

    async function populateObatSelect(selectEl) {
        const items = await DB.getMasterByType('obatList');
        selectEl.innerHTML = '<option value="">-- Pilih Obat --</option>';
        items.forEach(v => { selectEl.innerHTML += `<option value="${v}">${v}</option>`; });
    }

    async function init() {
        await populateDropdowns();
        document.getElementById('pambTanggal').value = Utils.todayStr();
        lineItems = [];
        await addLine();
        await refreshTable();
    }

    async function addLine() {
        const container = document.getElementById('pambLines');
        const idx = container.children.length;
        const row = document.createElement('div');
        row.className = 'invoice-line invoice-line-with-date';
        row.innerHTML = `
            <div class="line-num">${idx + 1}</div>
            <div class="line-date">
                <input type="date" class="form-control pamb-date-input" data-idx="${idx}" value="${Utils.todayStr()}">
            </div>
            <div class="line-obat">
                <select class="form-control pamb-obat-select" data-idx="${idx}">
                    <option value="">-- Pilih Obat --</option>
                </select>
            </div>
            <div class="line-qty">
                <input type="number" class="form-control pamb-qty-input" data-idx="${idx}" placeholder="Jumlah" min="0" step="1">
            </div>
            <div class="line-action">
                <button class="btn-icon btn-danger" onclick="PenambahanObat.removeLine(this)" title="Hapus baris">✕</button>
            </div>
        `;
        container.appendChild(row);
        await populateObatSelect(row.querySelector('.pamb-obat-select'));
    }

    function removeLine(btn) {
        const line = btn.closest('.invoice-line');
        line.remove();
        document.querySelectorAll('#pambLines .invoice-line').forEach((row, i) => {
            row.querySelector('.line-num').textContent = i + 1;
        });
    }

    function getLineItems() {
        const items = [];
        document.querySelectorAll('#pambLines .invoice-line').forEach(row => {
            const tanggalMasuk = row.querySelector('.pamb-date-input').value;
            const obat = row.querySelector('.pamb-obat-select').value;
            const qty = parseInt(row.querySelector('.pamb-qty-input').value) || 0;
            if (obat && qty > 0) items.push({ tanggalMasuk, obat, qty });
        });
        return items;
    }

    async function saveData() {
        const items = getLineItems();
        if (items.length === 0) { Utils.showToast('Tambahkan minimal 1 obat', 'warning'); return; }

        const data = {
            tanggal: document.getElementById('pambTanggal').value,
            penanggungJawab: document.getElementById('pambPJ').value,
            items: items,
            createdAt: new Date().toISOString()
        };

        try {
            await DB.add('penambahan_obat', data);
            Utils.showToast('Data penambahan obat berhasil disimpan!', 'success');
            clearForm();
            await refreshTable();
        } catch (err) {
            console.error('Save penambahan obat error:', err);
            Utils.showToast('Gagal menyimpan: ' + err.message, 'error');
        }
    }

    async function clearForm() {
        document.getElementById('pambTanggal').value = Utils.todayStr();
        const pj = document.getElementById('pambPJ');
        if (pj) pj.selectedIndex = 0;
        document.getElementById('pambLines').innerHTML = '';
        await addLine();
    }

    async function refreshTable() {
        const data = await DB.getAll('penambahan_obat');
        const tbody = document.getElementById('pambTableBody');
        if (!tbody) return;
        data.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.id - a.id));
        tbody.innerHTML = data.map((r, i) => {
            const itemsHtml = (r.items || []).map(it =>
                `${Utils.formatDate(it.tanggalMasuk)} — ${it.obat}: <strong>${it.qty}</strong>`
            ).join('<br>');
            return `
                <tr>
                    <td>${data.length - i}</td>
                    <td>${Utils.formatDate(r.tanggal)}</td>
                    <td>${r.penanggungJawab || '-'}</td>
                    <td class="items-cell">${itemsHtml}</td>
                    <td>
                        <button class="btn-icon btn-danger" onclick="PenambahanObat.deleteRecord(${r.id})" title="Hapus">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function deleteRecord(id) {
        if (!confirm('Hapus data penambahan obat ini?')) return;
        await DB.remove('penambahan_obat', id);
        Utils.showToast('Data dihapus', 'info');
        await refreshTable();
    }

    async function exportExcel() {
        const data = await DB.getAll('penambahan_obat');
        const rows = [];
        data.forEach(r => {
            (r.items || []).forEach(it => {
                rows.push({
                    'Tanggal Record': Utils.formatDate(r.tanggal),
                    'Penanggung Jawab': r.penanggungJawab,
                    'Tanggal Masuk': Utils.formatDate(it.tanggalMasuk),
                    Obat: it.obat,
                    Jumlah: it.qty
                });
            });
        });
        Utils.exportToExcel(rows, `penambahan_obat_${Utils.todayStr()}.xlsx`, 'Penambahan Obat');
    }

    return { init, saveData, clearForm, addLine, removeLine, refreshTable, deleteRecord, exportExcel, populateDropdowns };
})();
