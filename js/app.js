/* ============================================
   APP CONTROLLER — Main SPA Router & Initializer
   ============================================ */
(async () => {
    // --- SPA Routing ---
    const navTabs = document.querySelectorAll('.nav-tab');
    const pages = document.querySelectorAll('.page-section');

    function navigateTo(pageId) {
        pages.forEach(p => p.classList.remove('active'));
        navTabs.forEach(t => t.classList.remove('active'));
        const page = document.getElementById(pageId);
        if (page) page.classList.add('active');
        const tab = document.querySelector(`[data-page="${pageId}"]`);
        if (tab) tab.classList.add('active');

        // Initialise page data on entry
        switch (pageId) {
            case 'pageDashboard': Dashboard.init(); break;
            case 'pageTreatment': Treatment.init(); break;
            case 'pageMoving': Moving.init(); break;
            case 'pagePengambilanObat': PengambilanObat.init(); break;
            case 'pagePenambahanObat': PenambahanObat.init(); break;
            case 'pagePenTrial': PenTrial.init(); break;
            case 'pageSettings': initSettingsPage(); break;
        }
    }

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const pageId = tab.dataset.page;
            const perm = tab.dataset.perm;

            // Dashboard is always public
            if (pageId === 'pageDashboard') {
                navigateTo(pageId);
                return;
            }

            // Check login
            if (!Auth.getUser()) {
                showLoginPage();
                return;
            }

            // Check permission
            if (perm && !Auth.hasPermission(perm)) {
                Utils.showToast('Anda tidak memiliki akses ke menu ini', 'warning');
                return;
            }

            navigateTo(pageId);
        });
    });

    // --- Login / Logout ---
    function showLoginPage() {
        document.getElementById('pageMain').classList.add('hidden');
        document.getElementById('pageLogin').classList.remove('hidden');
        document.getElementById('loginError').textContent = '';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginUsername').focus();
    }

    function showMainApp() {
        document.getElementById('pageLogin').classList.add('hidden');
        document.getElementById('pageMain').classList.remove('hidden');
        updateUI();
    }

    function updateUI() {
        const user = Auth.getUser();
        const headerUser = document.getElementById('headerUser');
        const btnLoginNav = document.getElementById('btnLoginNav');
        const btnLogout = document.getElementById('btnLogout');

        if (user) {
            headerUser.textContent = `👤 ${user.username} (${user.role})`;
            btnLoginNav.style.display = 'none';
            btnLogout.style.display = '';
            // Show/hide nav tabs based on permissions
            navTabs.forEach(tab => {
                const perm = tab.dataset.perm;
                if (perm) {
                    tab.style.display = Auth.hasPermission(perm) ? '' : 'none';
                }
            });
        } else {
            headerUser.textContent = '';
            btnLoginNav.style.display = '';
            btnLogout.style.display = 'none';
            // Hide all protected tabs
            navTabs.forEach(tab => {
                if (tab.dataset.perm) tab.style.display = 'none';
            });
        }
    }

    // Login button
    document.getElementById('btnLogin').addEventListener('click', async () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const error = document.getElementById('loginError');

        console.log('[App] Login button clicked', { username, password });

        if (!username || !password) {
            error.textContent = 'Username dan password harus diisi';
            return;
        }

        try {
            const result = await Auth.login(username, password);
            console.log('[App] Auth result:', result);

            if (result.success) {
                Utils.showToast(`Selamat datang, ${username}!`, 'success');
                showMainApp();
                navigateTo('pageDashboard');
            } else {
                error.textContent = result.message || 'Username atau password salah';
            }
        } catch (e) {
            console.error('[App] Login error:', e);
            error.textContent = 'Terjadi kesalahan sistem: ' + e.message;
        }
    });

    // Enter key on password field
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('btnLogin').click();
    });

    // Logout button
    document.getElementById('btnLogout').addEventListener('click', () => {
        Auth.logout();
        Utils.showToast('Berhasil logout', 'info');
        updateUI();
        navigateTo('pageDashboard');
    });

    // Login nav button (header)
    document.getElementById('btnLoginNav').addEventListener('click', showLoginPage);

    // Back to dashboard from login page
    document.getElementById('btnBackToDashboard').addEventListener('click', (e) => {
        e.preventDefault();
        showMainApp();
        navigateTo('pageDashboard');
    });

    // --- Add Master Data (+ button) ---
    document.querySelectorAll('.btn-add-master').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const labels = {
                penanggungJawab: 'Penanggung Jawab',
                shipment: 'Shipment',
                jenisPakan: 'Jenis Pakan',
                diagnosa: 'Diagnosa',
                penAkhir: 'Pen / Hospital',
                antiBiotik: 'Anti Biotik',
                antiInflamasi: 'Anti Inflamasi',
                analgesik: 'Analgesik',
                supportive: 'Supportive',
                antiParasitic: 'Anti Parasitic',
                antiBloat: 'Anti Bloat',
                obatList: 'Obat',
                keteranganMoving: 'Keterangan Moving',
            };
            document.getElementById('modalAddMasterTitle').textContent = `Tambah ${labels[type] || type}`;
            document.getElementById('modalAddMasterType').value = type;
            document.getElementById('modalAddMasterInput').value = '';
            Utils.openModal('modalAddMaster');
            document.getElementById('modalAddMasterInput').focus();
        });
    });

    document.getElementById('btnModalAddMasterSave').addEventListener('click', async () => {
        const type = document.getElementById('modalAddMasterType').value;
        const value = document.getElementById('modalAddMasterInput').value.trim();
        if (!value) return;
        await DB.addMaster(type, value);
        Utils.showToast(`"${value}" ditambahkan`, 'success');
        Utils.closeModal('modalAddMaster');
        // Re-populate all dropdowns for the active page
        const activePage = document.querySelector('.page-section.active');
        if (activePage) {
            if (activePage.id === 'pageTreatment') Treatment.populateDropdowns();
            else if (activePage.id === 'pageMoving') Moving.populateDropdowns();
            else if (activePage.id === 'pagePengambilanObat') PengambilanObat.populateDropdowns();
            else if (activePage.id === 'pagePenambahanObat') PenambahanObat.populateDropdowns();
            else if (activePage.id === 'pagePenTrial') PenTrial.populateDropdowns();
        }
    });

    // Enter key in modal
    document.getElementById('modalAddMasterInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('btnModalAddMasterSave').click();
    });

    // --- Feature Module Buttons ---
    // Treatment
    document.getElementById('btnTreatSave').addEventListener('click', () => Treatment.saveData());
    document.getElementById('btnTreatClear').addEventListener('click', () => Treatment.clearForm());
    document.getElementById('btnTreatExport').addEventListener('click', () => Treatment.exportExcel());

    // Moving
    document.getElementById('btnMovSave').addEventListener('click', () => Moving.saveData());
    document.getElementById('btnMovClear').addEventListener('click', () => Moving.clearForm());
    document.getElementById('btnMovExport').addEventListener('click', () => Moving.exportExcel());

    // Pengambilan Obat
    document.getElementById('btnPobjSave').addEventListener('click', () => PengambilanObat.saveData());
    document.getElementById('btnPobjClear').addEventListener('click', () => PengambilanObat.clearForm());
    document.getElementById('btnPobjExport').addEventListener('click', () => PengambilanObat.exportExcel());

    // Penambahan Obat
    document.getElementById('btnPambSave').addEventListener('click', () => PenambahanObat.saveData());
    document.getElementById('btnPambClear').addEventListener('click', () => PenambahanObat.clearForm());
    document.getElementById('btnPambExport').addEventListener('click', () => PenambahanObat.exportExcel());

    // PEN Trial
    document.getElementById('btnPtSave').addEventListener('click', () => PenTrial.saveData());
    document.getElementById('btnPtClear').addEventListener('click', () => PenTrial.clearForm());
    document.getElementById('btnPtExport').addEventListener('click', () => PenTrial.exportExcel());

    // --- Settings page ---
    // Backup
    document.getElementById('btnBackupExport').addEventListener('click', () => Backup.exportJSON());
    document.getElementById('backupFile').addEventListener('change', (e) => {
        if (e.target.files.length > 0) Backup.importJSON(e.target.files[0]);
    });
    document.getElementById('btnExportExcel').addEventListener('click', () => Backup.exportExcel());

    // Serial
    document.getElementById('btnConnectScanner').addEventListener('click', () => Serial.connect('scanner'));
    document.getElementById('btnConnectScale').addEventListener('click', () => Serial.connect('scale'));

    // Supabase Sync
    document.getElementById('btnSyncUpload').addEventListener('click', () => SupabaseSync.syncUp());
    document.getElementById('btnSyncDownload').addEventListener('click', () => SupabaseSync.syncDown());
    document.getElementById('btnSupabaseConfig').addEventListener('click', async () => {
        const config = await SupabaseSync.getConfig();
        document.getElementById('configSupabaseUrl').value = config?.url || '';
        document.getElementById('configSupabaseKey').value = config?.key || '';
        Utils.openModal('modalSupabaseConfig');
    });
    document.getElementById('btnSaveSupabaseConfig').addEventListener('click', async () => {
        const url = document.getElementById('configSupabaseUrl').value.trim();
        const key = document.getElementById('configSupabaseKey').value.trim();
        await SupabaseSync.saveConfig(url, key);
        Utils.showToast('Konfigurasi Supabase disimpan', 'success');
        Utils.closeModal('modalSupabaseConfig');
        updateSyncStatus();
    });

    // User Management
    document.getElementById('btnManageUsers').addEventListener('click', () => {
        refreshUserTable();
        Utils.openModal('modalUserManagement');
    });

    document.getElementById('btnAddUser').addEventListener('click', async () => {
        const username = document.getElementById('newUserUsername').value.trim();
        const password = document.getElementById('newUserPassword').value.trim();
        if (!username || !password) { Utils.showToast('Username & password harus diisi', 'warning'); return; }

        const permissions = {
            treatment: document.getElementById('permTreatment').checked,
            moving: document.getElementById('permMoving').checked,
            pengambilanObat: document.getElementById('permPengambilanObat').checked,
            penambahanObat: document.getElementById('permPenambahanObat').checked,
            penTrial: document.getElementById('permPenTrial').checked,
            settings: document.getElementById('permSettings').checked,
        };

        const result = await Auth.addUser(username, password, 'user', permissions);
        if (result.success) {
            Utils.showToast(`User "${username}" berhasil ditambahkan`, 'success');
            document.getElementById('newUserUsername').value = '';
            document.getElementById('newUserPassword').value = '';
            refreshUserTable();
        } else {
            Utils.showToast('Gagal: ' + result.message, 'error');
        }
    });

    async function refreshUserTable() {
        const users = await Auth.getAllUsers();
        const container = document.getElementById('userTableContainer');
        container.innerHTML = `
            <table class="user-table">
                <thead>
                    <tr><th>Username</th><th>Role</th><th>Akses</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td><strong>${u.username}</strong></td>
                            <td>${u.role}</td>
                            <td>${Object.entries(u.permissions || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || 'Semua'}</td>
                            <td>${u.role !== 'admin' ? `<button class="btn-icon btn-danger btn-sm" onclick="App.deleteUser('${u.username}')">🗑️</button>` : '<span style="color:var(--text-muted)">Admin</span>'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    window.App = {
        deleteUser: async (username) => {
            if (!confirm(`Hapus user "${username}"?`)) return;
            const result = await Auth.deleteUser(username);
            if (result.success) {
                Utils.showToast('User dihapus', 'info');
                refreshUserTable();
            } else {
                Utils.showToast(result.message || 'Gagal menghapus user', 'error');
            }
        }
    };

    // --- Settings page init ---
    async function initSettingsPage() {
        updateSyncStatus();
        await refreshActivityLog();
    }

    async function updateSyncStatus() {
        const config = await SupabaseSync.getConfig();
        const statusEl = document.getElementById('syncStatus');
        if (config && config.url && config.key) {
            statusEl.innerHTML = '✅ Terhubung';
        } else {
            statusEl.innerHTML = '❌ Tidak dikonfigurasi';
        }
        // Show last sync time
        const lastSync = await DB.get('settings', 'lastSync');
        const lastTimeEl = document.getElementById('syncLastTime');
        if (lastSync && lastSync.value) {
            lastTimeEl.textContent = new Date(lastSync.value).toLocaleString('id-ID');
        } else {
            lastTimeEl.textContent = '-';
        }
    }

    async function refreshActivityLog() {
        const logs = await DB.getAll('sync_log');
        const container = document.getElementById('logContainer');
        if (logs.length === 0) {
            container.innerHTML = '<div class="empty-state">Belum ada aktivitas</div>';
            return;
        }
        logs.sort((a, b) => (b.id || 0) - (a.id || 0));
        const recent = logs.slice(0, 20);
        container.innerHTML = `
            <table class="data-table compact">
                <thead><tr><th>Waktu</th><th>Aksi</th><th>Detail</th></tr></thead>
                <tbody>
                    ${recent.map(l => `
                        <tr>
                            <td style="white-space:nowrap">${l.timestamp ? new Date(l.timestamp).toLocaleString('id-ID') : '-'}</td>
                            <td>${l.action || '-'}</td>
                            <td>${l.detail || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // --- Serial listeners ---
    Serial.onData('scanner', (data) => {
        // Auto-fill eartag fields on the active page
        const activePage = document.querySelector('.page-section.active');
        if (!activePage) return;
        const eartagFields = activePage.querySelectorAll('input[id$="Eartag"]');
        eartagFields.forEach(field => {
            field.value = data.trim();
            field.dispatchEvent(new Event('change'));
        });
    });

    Serial.onData('scale', (data) => {
        const weight = parseFloat(data);
        if (!isNaN(weight)) {
            document.getElementById('weightValue').textContent = weight.toFixed(1);
            document.getElementById('weightDisplay').classList.add('visible');

            // Auto-fill weight fields
            const activePage = document.querySelector('.page-section.active');
            if (activePage) {
                const beratFields = activePage.querySelectorAll('input[id$="Berat"]');
                beratFields.forEach(field => { field.value = weight.toFixed(1); });
            }
        }
    });

    Serial.onStatusChange((type, connected) => {
        const dot = type === 'scanner' ? document.getElementById('dotScanner') : document.getElementById('dotScale');
        dot.classList.toggle('connected', connected);
    });

    // --- Service Worker ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(r => console.log('SW registered:', r.scope))
            .catch(e => console.warn('SW registration failed:', e));
    }

    // --- INIT ---
    await DB.open();
    await Auth.init();
    updateUI();
    navigateTo('pageDashboard');

})();
