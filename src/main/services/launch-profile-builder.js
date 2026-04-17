const path = require('path');
const os = require('os');

function buildLaunchProfile(payload = {}) {
    const instanceId = String(payload.instanceId || 'default');
    const root = String(
        payload.root ||
        path.join(os.homedir(), '.zyneon', 'instances', instanceId)
    );
    const cache = String(
        payload.cache ||
        path.join(os.homedir(), '.zyneon', 'cache')
    );

    const mcVersion = String(payload.mcVersion || '1.20.1');
    const username = String(payload.username || 'Player');
    const accessToken = String(payload.accessToken || '0');
    const uuid = String(payload.uuid || '00000000-0000-0000-0000-000000000000');
    const memoryMin = `${Math.max(Number(payload.memoryMin ?? 1024), 256)}M`;
    const memoryMax = `${Math.max(Number(payload.memoryMax ?? 2048), Number(payload.memoryMin ?? 1024))}M`;

    const profile = {
        kind: 'mcl',
        root,
        cache,
        authorization: {
            access_token: accessToken,
            client_token: String(payload.clientToken || '0'),
            uuid: uuid,
            name: username,
            user_properties: {},
            meta: {
                type: payload.uuid && payload.uuid !== '00000000-0000-0000-0000-000000000000' ? 'msa' : 'Mojang'
            }
        },
        version: {
            number: mcVersion,
            type: String(payload.versionType || 'release')
        },
        memory: {
            min: memoryMin,
            max: memoryMax
        },
        javaPath: payload.javaPath ? String(payload.javaPath) : undefined,
        window: {
            width: Number(payload.windowWidth ?? 1280),
            height: Number(payload.windowHeight ?? 720),
            fullscreen: Boolean(payload.fullscreen ?? false)
        },
        overrides: {
            gameDirectory: root
        }
    };

    if (payload.forgeVersion) {
        profile.forge = String(payload.forgeVersion);
    }

    return profile;
}

module.exports = { buildLaunchProfile };