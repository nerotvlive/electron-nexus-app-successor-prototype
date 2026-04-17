const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const { Client } = require('minecraft-launcher-core');

class LaunchService extends EventEmitter {
    constructor() {
        super();
        this.currentProcess = null;
        this.killTimeout = null;
        this.mcl = new Client();
        this.isMclRun = false;
    }

    async start(payload = {}) {
        if (this.currentProcess || this.isMclRun) {
            throw new Error('Es läuft bereits ein Spielprozess.');
        }

        if (payload.kind === 'mcl') {
            return this.startWithMcl(payload);
        }

        return this.startGeneric(payload);
    }

    async startWithMcl(options) {
        this.isMclRun = true;
        this.emit('event', { type: 'state', state: 'launching' });

        const onData = (e) => {
            this.emit('event', { type: 'log', stream: 'stdout', message: `${e}\n` });
        };
        const onDebug = (e) => {
            this.emit('event', { type: 'log', stream: 'stderr', message: `[debug] ${e}\n` });
        };
        const onProgress = (e) => {
            this.emit('event', { type: 'progress', value: e });
        };
        const onClose = (code) => {
            this.emit('event', { type: 'state', state: 'stopped', code, signal: null });
            this.isMclRun = false;
            this.mcl.removeListener('data', onData);
            this.mcl.removeListener('debug', onDebug);
            this.mcl.removeListener('progress', onProgress);
            this.mcl.removeListener('close', onClose);
        };

        this.mcl.on('data', onData);
        this.mcl.on('debug', onDebug);
        this.mcl.on('progress', onProgress);
        this.mcl.on('close', onClose);

        this.mcl.launch(options);
        this.emit('event', { type: 'state', state: 'running' });

        return {
            mode: 'mcl',
            root: options.root,
            version: options.version?.number
        };
    }

    async startGeneric(payload = {}) {
        const javaPath = String(payload.javaPath || 'java');
        const args = Array.isArray(payload.args) ? payload.args.map(String) : [];
        const cwd = payload.cwd ? String(payload.cwd) : process.cwd();
        const env = { ...process.env, ...(payload.env || {}) };

        this.emit('event', { type: 'state', state: 'launching' });

        const child = spawn(javaPath, args, {
            cwd,
            env,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        this.currentProcess = child;

        child.on('spawn', () => {
            this.emit('event', { type: 'state', state: 'running', pid: child.pid });
        });

        child.stdout?.on('data', (chunk) => {
            this.emit('event', { type: 'log', stream: 'stdout', message: chunk.toString() });
        });

        child.stderr?.on('data', (chunk) => {
            this.emit('event', { type: 'log', stream: 'stderr', message: chunk.toString() });
        });

        child.on('error', (error) => {
            this.emit('event', {
                type: 'state',
                state: 'error',
                error: error?.message || String(error),
            });
        });

        child.on('exit', (code, signal) => {
            if (this.killTimeout) {
                clearTimeout(this.killTimeout);
                this.killTimeout = null;
            }
            this.emit('event', { type: 'state', state: 'stopped', code, signal });
            this.currentProcess = null;
        });

        return { mode: 'generic', pid: child.pid, javaPath, args, cwd };
    }

    async stop() {
        if (this.isMclRun) {
            return {
                stopped: false,
                reason: 'mcl-stop-not-implemented'
            };
        }

        if (!this.currentProcess) {
            return { stopped: false, reason: 'not-running' };
        }

        const proc = this.currentProcess;
        proc.kill('SIGTERM');

        this.killTimeout = setTimeout(() => {
            if (this.currentProcess && this.currentProcess.pid === proc.pid) {
                proc.kill('SIGKILL');
            }
        }, 5000);

        return { stopped: true };
    }
}

module.exports = { LaunchService };