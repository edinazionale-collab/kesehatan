/* ============================================
   AUTH MODULE — Local Login & User Management
   ============================================ */
const Auth = (() => {
    let currentUser = null;

    // --- Initialize default admin user if none exists ---
    async function init() {
        console.log('[Auth] Initializing...');
        try {
            const users = await DB.getAll('users');
            console.log(`[Auth] Found ${users.length} users in DB`);

            if (users.length === 0) {
                console.log('[Auth] No users found. Creating default admin...');
                await DB.add('users', {
                    username: 'Sidiq23',
                    password: 'sck777',
                    role: 'admin',
                    permissions: {
                        treatment: true,
                        moving: true,
                        pengambilanObat: true,
                        penambahanObat: true,
                        penTrial: true,
                        settings: true
                    }
                });
                console.log('[Auth] Default admin created: Sidiq23');
            }
        } catch (e) {
            console.error('[Auth] Init error:', e);
        }
        // Restore session
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            return currentUser;
        }
        return null;
    }

    // --- Login ---
    async function login(username, password) {
        console.log(`[Auth] Attempting login for: "${username}"`);
        let user = await DB.get('users', username);

        // Case-insensitive fallback
        if (!user) {
            console.log('[Auth] Exact match not found, trying case-insensitive...');
            const all = await DB.getAll('users');
            user = all.find(u => u.username.toLowerCase() === username.toLowerCase());
        }

        if (!user) {
            console.error('[Auth] User not found in DB');
            return { success: false, message: 'User tidak ditemukan' };
        }

        console.log(`[Auth] User found: ${user.username}. Checking password...`);
        if (user.password !== password) {
            console.error('[Auth] Password mismatch');
            return { success: false, message: 'Password salah' };
        }

        currentUser = user;
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        DB.addLog('Auth', `User "${username}" logged in`);
        console.log('[Auth] Login successful');
        return { success: true, user };
    }

    // --- Logout ---
    function logout() {
        if (currentUser) {
            DB.addLog('Auth', `User "${currentUser.username}" logged out`);
        }
        currentUser = null;
        sessionStorage.removeItem('currentUser');
    }

    // --- Get current user ---
    function getUser() { return currentUser; }
    function isAdmin() { return currentUser && currentUser.role === 'admin'; }
    function isLoggedIn() { return currentUser !== null; }

    // --- User CRUD ---
    async function addUser(username, password, role, permissions) {
        const existing = await DB.get('users', username);
        if (existing) return { success: false, message: 'Username sudah ada' };
        await DB.add('users', { username, password, role, permissions });
        DB.addLog('Auth', `User "${username}" created with role ${role}`);
        return { success: true };
    }

    async function deleteUser(username) {
        if (username === 'Sidiq23') return { success: false, message: 'Tidak bisa menghapus admin utama' };
        await DB.remove('users', username);
        DB.addLog('Auth', `User "${username}" deleted`);
        return { success: true };
    }

    async function updateUser(username, data) {
        const user = await DB.get('users', username);
        if (!user) return { success: false, message: 'User tidak ditemukan' };
        Object.assign(user, data);
        await DB.update('users', user);
        DB.addLog('Auth', `User "${username}" updated`);
        return { success: true };
    }

    async function getAllUsers() {
        return DB.getAll('users');
    }

    // --- Check permission ---
    function hasPermission(module) {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        return currentUser.permissions && currentUser.permissions[module];
    }

    async function resetAdmin() {
        console.log('[Auth] Resetting admin user...');
        await DB.remove('users', 'Sidiq23');
        await init();
        alert('Admin user reset! Try login with Sidiq23 / sck777');
    }

    return {
        init, login, logout, getUser, isAdmin, isLoggedIn,
        addUser, deleteUser, updateUser, getAllUsers,
        hasPermission, resetAdmin
    };
})();
