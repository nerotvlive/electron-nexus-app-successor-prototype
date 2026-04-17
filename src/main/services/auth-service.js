const { Auth } = require('msmc');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');
const os = require('os');

class AuthService extends EventEmitter {
    constructor() {
        super();
        this.auth = new Auth('select_account');
        this.userData = null;
        this.configPath = path.join(os.homedir(), '.zyneon', 'auth.json');
        this.ensureDir();
    }

    ensureDir() {
        const dir = path.dirname(this.configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    async loginMicrosoft() {
        try {
            const xboxManager = await this.auth.launch('electron');
            const token = await xboxManager.getMinecraft();
            
            this.userData = {
                type: 'msa',
                username: token.mclc().name,
                uuid: token.mclc().uuid,
                accessToken: token.mclc().access_token,
                clientToken: token.mclc().client_token,
                profile: token.mclc()
            };

            this.saveSession();
            return { ok: true, user: this.userData };
        } catch (error) {
            console.error('Microsoft login error:', error);
            return { ok: false, error: error.message };
        }
    }

    async loginOffline(username) {
        if (!username || username.trim() === '') {
            return { ok: false, error: 'Username is required for offline mode.' };
        }

        // Generate a deterministic UUID for the offline username
        // Simplified version of what some launchers do
        const uuid = '00000000-0000-0000-0000-' + username.split('').reduce((acc, char) => {
            return acc + char.charCodeAt(0).toString(16);
        }, '').slice(0, 12).padStart(12, '0');

        this.userData = {
            type: 'offline',
            username: username,
            uuid: uuid,
            accessToken: '0',
            clientToken: '0',
            profile: {
                name: username,
                uuid: uuid,
                access_token: '0',
                client_token: '0',
                user_properties: '{}',
                meta: {
                    type: 'mojang',
                    offline: true
                }
            }
        };

        this.saveSession();
        return { ok: true, user: this.userData };
    }

    saveSession() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.userData, null, 2));
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }

    loadSession() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                this.userData = JSON.parse(data);
                return this.userData;
            }
        } catch (error) {
            console.error('Failed to load session:', error);
        }
        return null;
    }

    logout() {
        this.userData = null;
        if (fs.existsSync(this.configPath)) {
            fs.unlinkSync(this.configPath);
        }
    }

    getUser() {
        return this.userData;
    }

    isLoggedIn() {
        return !!this.userData;
    }
}

module.exports = { AuthService };
