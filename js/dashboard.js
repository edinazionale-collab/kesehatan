/* ============================================
   DASHBOARD MODULE — Public (no login required)
   ============================================ */
const Dashboard = (() => {

    async function init() {
        await refreshHospital();
        await refreshStokObat();
        await refreshStatusSapi();
        await refreshPenTrial();
    }

    // ========== HOSPITAL SECTION ==========
    async function refreshHospital() {
        const treatments = await DB.getAll('treatment');
        const container = document.getElementById('dashHospitalContent');
        if (!container) return;

        // Group by penAkhir (hospital pens)
        const penGroups = {};
        treatments.forEach(t => {
            if (t.penAkhir) {
                if (!penGroups[t.penAkhir]) penGroups[t.penAkhir] = [];
                penGroups[t.penAkhir].push(t);
            }
        });

        // Load saved colors
        const colorSettings = await DB.get('settings', 'hospitalColors');
        const colors = (colorSettings && colorSettings.value) || {};

        if (Object.keys(penGroups).length === 0) {
            container.innerHTML = '<div class="empty-state">Belum ada data hospital</div>';
            return;
        }

        let html = '';
        for (const [pen, records] of Object.entries(penGroups)) {
            const penColor = colors[pen] || '#1e293b';
            // Get unique eartags, show latest treatment per eartag
            const latestByEartag = {};
            records.forEach(r => {
                if (!latestByEartag[r.eartag] || r.tanggal > latestByEartag[r.eartag].tanggal) {
                    latestByEartag[r.eartag] = r;
                }
            });

            html += `
                <div class="hospital-pen-card" style="border-left: 4px solid ${penColor}">
                    <div class="pen-card-header">
                        <h4>${pen} <span class="badge">${Object.keys(latestByEartag).length} ekor</span></h4>
                        <input type="color" value="${penColor}" class="color-picker"
                               onchange="Dashboard.setPenColor('${pen}', this.value)"
                               title="Ubah warna pen">
                    </div>
                    <div class="pen-card-table-wrapper">
                        <table class="data-table compact">
                            <thead>
                                <tr>
                                    <th>Tgl Treatment</th>
                                    <th>Eartag</th>
                                    <th>Shipment</th>
                                    <th>Diagnosa</th>
                                    <th>Jenis Pakan</th>
                                    <th>Treat Ke</th>
                                    <th>Kondisi</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.values(latestByEartag).map(r => `
                                    <tr>
                                        <td>${Utils.formatDate(r.tanggal)}</td>
                                        <td><strong>${r.eartag}</strong></td>
                                        <td>${r.shipment || '-'}</td>
                                        <td>${r.diagnosa || '-'}</td>
                                        <td>${r.jenisPakan || '-'}</td>
                                        <td>${r.treatmentKe || '-'}</td>
                                        <td>
                                            <span class="kondisi-badge ${(r.kondisi || 'Dirawat').toLowerCase().replace(/\s/g, '-')}">
                                                ${r.kondisi || 'Dirawat'}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="btn-icon btn-sm" onclick="Dashboard.updateKondisi(${r.id})" title="Update kondisi">📝</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    async function setPenColor(pen, color) {
        const colorSettings = await DB.get('settings', 'hospitalColors');
        const colors = (colorSettings && colorSettings.value) || {};
        colors[pen] = color;
        await DB.add('settings', { key: 'hospitalColors', value: colors });
        await refreshHospital();
    }

    async function updateKondisi(treatmentId) {
        const record = await DB.get('treatment', treatmentId);
        if (!record) return;
        const kondisi = prompt(`Update kondisi untuk eartag ${record.eartag}:\n(Dirawat / Sembuh / Pemulihan / Urgent / Jual Salvage)\n\nAtau tulis catatan:`, record.kondisi || 'Dirawat');
        if (kondisi === null) return;
        record.kondisi = kondisi.trim();
        await DB.update('treatment', record);
        Utils.showToast('Kondisi updated', 'success');
        await refreshHospital();
        await refreshStatusSapi();
    }

    // ========== STOK OBAT SECTION ==========
    async function refreshStokObat() {
        const container = document.getElementById('dashStokObatContent');
        if (!container) return;

        const pengambilan = await DB.getAll('pengambilan_obat');
        const penambahan = await DB.getAll('penambahan_obat');

        // Calculate stock: additions - pickups
        const stock = {};

        penambahan.forEach(rec => {
            (rec.items || []).forEach(it => {
                stock[it.obat] = (stock[it.obat] || 0) + it.qty;
            });
        });

        pengambilan.forEach(rec => {
            (rec.items || []).forEach(it => {
                stock[it.obat] = (stock[it.obat] || 0) - it.qty;
            });
        });

        const sortedStock = Object.entries(stock).sort((a, b) => a[0].localeCompare(b[0]));

        if (sortedStock.length === 0) {
            container.innerHTML = '<div class="empty-state">Belum ada data stok obat</div>';
            return;
        }

        container.innerHTML = `
            <table class="data-table compact">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Nama Obat</th>
                        <th>Stok</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedStock.map(([obat, qty], i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${obat}</td>
                            <td><strong>${qty}</strong></td>
                            <td>
                                <span class="stock-badge ${qty <= 0 ? 'empty' : qty <= 5 ? 'low' : 'ok'}">
                                    ${qty <= 0 ? '❌ Habis' : qty <= 5 ? '⚠️ Rendah' : '✅ OK'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // ========== STATUS SAPI SECTION ==========
    async function refreshStatusSapi() {
        const container = document.getElementById('dashStatusSapiContent');
        if (!container) return;

        const treatments = await DB.getAll('treatment');
        const movings = await DB.getAll('moving');
        const salvages = await DB.getAll('salvage');

        // Collect status from treatment kondisi field
        const statusGroups = { 'Sembuh': [], 'Pemulihan': [], 'Urgent': [], 'Jual Salvage': [], 'Dirawat': [] };

        // From treatments
        treatments.forEach(t => {
            const k = t.kondisi || 'Dirawat';
            if (statusGroups[k]) {
                statusGroups[k].push(t);
            } else {
                if (!statusGroups['Dirawat']) statusGroups['Dirawat'] = [];
                statusGroups['Dirawat'].push(t);
            }
        });

        // From movings
        movings.forEach(m => {
            if (m.keterangan && statusGroups[m.keterangan]) {
                statusGroups[m.keterangan].push({ eartag: m.eartag, tanggal: m.tanggal, shipment: m.shipment, source: 'Moving' });
            }
        });

        // From salvage
        salvages.forEach(s => {
            statusGroups['Jual Salvage'].push({ eartag: s.eartag, tanggal: s.tanggal, shipment: s.shipment, source: 'Salvage' });
        });

        const tabs = ['Sembuh', 'Pemulihan', 'Urgent', 'Jual Salvage', 'Dirawat'];
        let html = '<div class="status-tabs">';
        tabs.forEach(tab => {
            const count = statusGroups[tab] ? statusGroups[tab].length : 0;
            html += `<button class="status-tab ${tab === 'Dirawat' ? 'active' : ''}" onclick="Dashboard.showStatusTab('${tab}')">${tab} <span class="badge">${count}</span></button>`;
        });
        html += '</div>';

        tabs.forEach(tab => {
            const items = statusGroups[tab] || [];
            html += `<div class="status-content" id="statusTab_${tab.replace(/\s/g, '_')}" style="${tab === 'Dirawat' ? '' : 'display:none'}">`;
            if (items.length === 0) {
                html += '<div class="empty-state">Tidak ada data</div>';
            } else {
                html += `
                    <table class="data-table compact">
                        <thead><tr><th>No</th><th>Tanggal</th><th>Eartag</th><th>Shipment</th></tr></thead>
                        <tbody>
                            ${items.map((r, i) => `<tr><td>${i + 1}</td><td>${Utils.formatDate(r.tanggal)}</td><td><strong>${r.eartag || '-'}</strong></td><td>${r.shipment || '-'}</td></tr>`).join('')}
                        </tbody>
                    </table>
                `;
            }
            html += '</div>';
        });

        container.innerHTML = html;
    }

    function showStatusTab(tab) {
        document.querySelectorAll('.status-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.status-tab').forEach(el => el.classList.remove('active'));
        const tabEl = document.getElementById('statusTab_' + tab.replace(/\s/g, '_'));
        if (tabEl) tabEl.style.display = '';
        // Activate button
        document.querySelectorAll('.status-tab').forEach(el => {
            if (el.textContent.includes(tab)) el.classList.add('active');
        });
    }

    // ========== PEN TRIAL SECTION ==========
    async function refreshPenTrial() {
        const container = document.getElementById('dashPenTrialContent');
        if (!container) return;

        const trials = await DB.getAll('pen_trial');
        if (trials.length === 0) {
            container.innerHTML = '<div class="empty-state">Belum ada data PEN Trial</div>';
            return;
        }

        trials.sort((a, b) => (a.kandang || '').localeCompare(b.kandang || '') || (a.pen || '').localeCompare(b.pen || ''));

        container.innerHTML = `
            <table class="data-table compact">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Tanggal Masuk</th>
                        <th>Kandang</th>
                        <th>PEN</th>
                        <th>Lama (Hari)</th>
                        <th>PJ</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    ${trials.map((r, i) => {
            const days = Utils.daysSince(r.tanggal);
            return `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${Utils.formatDate(r.tanggal)}</td>
                                <td>${r.kandang || '-'}</td>
                                <td><strong>${r.pen}</strong></td>
                                <td class="${days > 14 ? 'days-warning' : ''}">${days} hari</td>
                                <td>${r.penanggungJawab || '-'}</td>
                                <td>
                                    <button class="btn-icon btn-danger btn-sm" onclick="Dashboard.deletePenTrial(${r.id})" title="Hapus (sapi habis)">🗑️</button>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    }

    async function deletePenTrial(id) {
        if (!confirm('Hapus PEN Trial ini? (Sapi di pen sudah habis?)')) return;
        await DB.remove('pen_trial', id);
        Utils.showToast('PEN Trial dihapus', 'info');
        await refreshPenTrial();
    }

    return {
        init, refreshHospital, refreshStokObat, refreshStatusSapi, refreshPenTrial,
        setPenColor, updateKondisi, showStatusTab, deletePenTrial
    };
})();
