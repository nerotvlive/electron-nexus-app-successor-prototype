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
            this.emit('authStateChanged', { loggedIn: true, user: this.userData });
            return { ok: true, user: this.userData };
        } catch (error) {
            console.error('Microsoft login error:', error);
            // If we have cached user data, we can still return it for offline use if the error is network-related
            // but we need to ensure userData is actually loaded
            if (!this.userData) {
                this.loadSession();
            }
            if (this.userData) {
                console.log('Using cached user data due to login error.');
                return { ok: true, user: this.userData, offline: true };
            }
            return { ok: false, error: error.message };
        }
    }

    async loginOffline() {
        if (!this.userData) {
            this.loadSession();
        }

        if (!this.userData) {
            return { ok: false, error: 'Kein Account hinterlegt. Bitte melde dich zuerst an.' };
        }

        console.log('Using cached user data for offline session.');
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
        this.emit('authStateChanged', { loggedIn: false, user: null });
    }

    getUser() {
        return this.userData;
    }

    isLoggedIn() {
        return !!this.userData;
    }
}

module.exports = { AuthService };
