/* ============================================
   PEN TRIAL MODULE
   ============================================ */
const PenTrial = (() => {
    // Default pen trial groups
    const DEFAULT_GROUPS = {
        'penTrialKandang1': ['101', '102', '103', '104', '105', '106', '107'],
        'penTrialKandang2': ['201', '202', '203', '204', '205', '206', '207', '208', '209', '210'],
        'penTrialKandang3': ['301', '302', '303', '304', '305', '306', '307', '308', '309', '310'],
    };

    async function initDefaults() {
        for (const [type, values] of Object.entries(DEFAULT_GROUPS)) {
            const existing = await DB.getMasterByType(type);
            if (existing.length === 0) {
                for (const v of values) await DB.addMaster(type, v);
            }
        }
        // Save group names
        const groups = await DB.getMasterByType('penTrialGroups');
        if (groups.length === 0) {
            await DB.addMaster('penTrialGroups', 'Kandang 1');
            await DB.addMaster('penTrialGroups', 'Kandang 2');
            await DB.addMaster('penTrialGroups', 'Kandang 3');
        }
    }

    async function populateDropdowns() {
        await Utils.populateSelect('ptPJ', 'penanggungJawab', '-- Pilih PJ --');
        await buildPenSelectors();
    }

    async function buildPenSelectors() {
        const container = document.getElementById('ptPenGroups');
        if (!container) return;
        container.innerHTML = '';

        const groups = await DB.getMasterByType('penTrialGroups');
        for (const groupName of groups) {
            const masterKey = 'penTrial' + groupName.replace(/\s+/g, '');
            const pens = await DB.getMasterByType(masterKey);

            const section = document.createElement('div');
            section.className = 'pen-group-section';
            section.innerHTML = `
                <div class="pen-group-header">
                    <h4>PEN TRIAL ${groupName}</h4>
                    <button class="btn-sm btn-outline" onclick="PenTrial.addPenToGroup('${masterKey}', '${groupName}')" title="Tambah PEN">+ PEN</button>
                </div>
                <div class="pen-group-body">
                    <select class="form-control pt-pen-select" data-group="${masterKey}" id="ptPen_${masterKey}">
                        <option value="">-- Pilih PEN --</option>
                        ${pens.map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                </div>
            `;
            container.appendChild(section);
        }
    }

    async function addPenToGroup(masterKey, groupName) {
        const value = prompt(`Tambah PEN ke ${groupName}:`);
        if (!value || !value.trim()) return;
        await DB.addMaster(masterKey, value.trim());
        Utils.showToast(`PEN ${value.trim()} ditambahkan ke ${groupName}`, 'success');
        await buildPenSelectors();
    }

    async function addNewGroup() {
        const name = prompt('Nama Kandang baru (contoh: Kandang 4):');
        if (!name || !name.trim()) return;
        await DB.addMaster('penTrialGroups', name.trim());
        const masterKey = 'penTrial' + name.trim().replace(/\s+/g, '');
        // Ask for first pen values
        const pens = prompt(`Masukkan nomor PEN untuk ${name.trim()} (pisahkan dengan koma, contoh: 401,402,403):`);
        if (pens) {
            for (const p of pens.split(',')) {
                const trimmed = p.trim();
                if (trimmed) await DB.addMaster(masterKey, trimmed);
            }
        }
        Utils.showToast(`Grup ${name.trim()} berhasil ditambahkan`, 'success');
        await buildPenSelectors();
    }

    async function init() {
        await initDefaults();
        await populateDropdowns();
        document.getElementById('ptTanggal').value = Utils.todayStr();
        await refreshTable();
    }

    async function saveData() {
        // Collect selected pens from all groups
        const selectedPens = [];
        document.querySelectorAll('.pt-pen-select').forEach(sel => {
            if (sel.value) {
                selectedPens.push({
                    group: sel.dataset.group,
                    pen: sel.value
                });
            }
        });

        if (selectedPens.length === 0) { Utils.showToast('Pilih minimal 1 PEN', 'warning'); return; }

        const tanggal = document.getElementById('ptTanggal').value;
        const pj = document.getElementById('ptPJ').value;

        try {
            for (const sp of selectedPens) {
                await DB.add('pen_trial', {
                    tanggal: tanggal,
                    penanggungJawab: pj,
                    kandang: sp.group,
                    pen: sp.pen,
                    createdAt: new Date().toISOString()
                });
            }
            Utils.showToast(`${selectedPens.length} PEN trial berhasil disimpan!`, 'success');
            clearForm();
            await refreshTable();
        } catch (err) {
            console.error('Save pen trial error:', err);
            Utils.showToast('Gagal menyimpan: ' + err.message, 'error');
        }
    }

    async function clearForm() {
        document.getElementById('ptTanggal').value = Utils.todayStr();
        const pj = document.getElementById('ptPJ');
        if (pj) pj.selectedIndex = 0;
        document.querySelectorAll('.pt-pen-select').forEach(sel => sel.selectedIndex = 0);
    }

    async function refreshTable() {
        const data = await DB.getAll('pen_trial');
        const tbody = document.getElementById('ptTableBody');
        if (!tbody) return;
        data.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.id - a.id));
        tbody.innerHTML = data.map((r, i) => {
            const days = Utils.daysSince(r.tanggal);
            return `
                <tr>
                    <td>${data.length - i}</td>
                    <td>${Utils.formatDate(r.tanggal)}</td>
                    <td>${r.penanggungJawab || '-'}</td>
                    <td>${r.kandang || '-'}</td>
                    <td><strong>${r.pen}</strong></td>
                    <td class="${days > 14 ? 'days-warning' : ''}">${days} hari</td>
                    <td>
                        <button class="btn-icon btn-danger" onclick="PenTrial.deleteRecord(${r.id})" title="Hapus (sapi habis)">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async function deleteRecord(id) {
        if (!confirm('Hapus PEN trial ini? (Sapi di pen sudah habis?)')) return;
        await DB.remove('pen_trial', id);
        Utils.showToast('PEN trial dihapus', 'info');
        await refreshTable();
    }

    async function exportExcel() {
        const data = await DB.getAll('pen_trial');
        const exported = data.map(r => ({
            Tanggal: Utils.formatDate(r.tanggal),
            'Penanggung Jawab': r.penanggungJawab,
            Kandang: r.kandang,
            PEN: r.pen,
            'Lama (hari)': Utils.daysSince(r.tanggal)
        }));
        Utils.exportToExcel(exported, `pen_trial_${Utils.todayStr()}.xlsx`, 'PEN Trial');
    }

    // Get pen trial feed type for auto-fill in treatment
    async function getPenTrialFeedType(pen) {
        const trials = await DB.getAllByIndex('pen_trial', 'pen', pen);
        if (trials.length > 0) {
            return 'Trial'; // Auto-fill jenis pakan as "Trial"
        }
        return null;
    }

    return {
        init, saveData, clearForm, addLine: addNewGroup, refreshTable,
        deleteRecord, exportExcel, populateDropdowns, buildPenSelectors,
        addPenToGroup, addNewGroup, getPenTrialFeedType
    };
})();
