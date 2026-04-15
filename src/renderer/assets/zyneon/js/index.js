let bodyBg = "#000000";
let bg = "#ffffff10";
let bodyBgMica = "#00000000";
let bgMica = "#ffffff08";
let darkMode = false;
let allowMica = false;
async function initColors(bodyBg_,bg_) {
    if(darkMode) {
        document.body.setAttribute("data-bs-theme", "dark")
    } else {
        document.body.setAttribute("data-bs-theme", "light")
    }
    if (navigator.userAgentData) {
        navigator.userAgentData.getHighEntropyValues(["platformVersion"]).then(ua => {
            if (ua.platform === "Windows") {
                const majorPlatformVersion = parseInt(ua.platformVersion.split('.')[0]);
                if (majorPlatformVersion >= 13) {
                    if(allowMica&&(localStorage.getItem('enable-mica')===null||localStorage.getItem('enable-mica')==='true')) {
                        document.body.style.setProperty("--zyn-body-bg", bodyBgMica);
                        document.body.style.setProperty("--zyn-bg", bgMica);
                        return;
                    }
                } else {
                    allowMica = false;
                    initMicaButton();
                }
            } else {
                allowMica = false;
                initMicaButton();
            }
            document.body.style.setProperty("--zyn-body-bg", bodyBg_);
            document.body.style.setProperty("--zyn-bg", bg_);
        });
    } else {
        document.body.style.setProperty("--zyn-body-bg", bodyBg_);
        document.body.style.setProperty("--zyn-bg", bg_);
    }
}

async function toggleMica() {
    if(localStorage.getItem("enable-mica")) {
        if(localStorage.getItem("enable-mica")==="true") {
            localStorage.setItem("enable-mica","false");
        } else {
            localStorage.setItem("enable-mica","true");
        }
    } else {
        localStorage.setItem("enable-mica","false");
    }
    initTheme();
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    if (localStorage.getItem("theme") === null || localStorage.getItem("theme") === "auto") {
        darkMode = e.matches;
        initTheme();
    }
});

function initTheme() {
    const nativeDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if(localStorage.getItem("theme")) {
        const theme = localStorage.getItem("theme");
        if(theme==="auto") {
            darkMode = nativeDarkMode;
        } else if(theme === "dark") {
            darkMode = true;
        } else {
            darkMode = false;
        }
    } else {
        darkMode = nativeDarkMode;
    }
    if (darkMode) {
        window.electronAPI.updateTitleBar({
            color: '#00000000',
            symbolColor: '#ffffff'
        });
        bodyBg = "#000000";
        bg = "#ffffff10";
        bodyBgMica = "#00000000";
        bgMica = "#ffffff08";
        document.body.setAttribute("data-bs-theme", "dark")
        allowMica = nativeDarkMode;
    } else {
        window.electronAPI.updateTitleBar({
            color: '#00000000',
            symbolColor: '#000000'
        });
        bodyBg = "#ffffff";
        bg = "#00000020";
        bodyBgMica = "#ffffff50";
        bgMica = "#00000020";
        document.body.setAttribute("data-bs-theme", "light")
        allowMica = !nativeDarkMode;
    }
    if(document.getElementById("app-logo")) {
        document.getElementById("app-logo").src = darkMode ? "./assets/zyneon/img/logo_dark.png" : "./assets/zyneon/img/logo_light.png";
    }
    initMicaButton();
    initThemeButton();
    initColors(bodyBg,bg);
}

function toggleTheme() {
    let theme = darkMode ? "light" : "dark";
    if(localStorage.getItem("theme")) {
        theme = localStorage.getItem("theme");
    }
    if(theme==="auto") {
        theme = "dark";
        darkMode = true;
        document.getElementById("theme-icon").className = "bi bi-moon";
    } else if(theme === "dark") {
        theme = "light";
        darkMode = false;
        document.getElementById("theme-icon").className = "bi bi-sun";
    } else {
        theme = "auto";
        darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.getElementById("theme-icon").className = "bi bi-brilliance";
    }
    localStorage.setItem("theme",theme);
    initTheme();
}

function initThemeButton() {
    let theme = darkMode ? "light" : "dark";
    if(localStorage.getItem("theme")) {
        theme = localStorage.getItem("theme");
    }
    document.getElementById("theme-icon").className = theme === "auto" ? "bi bi-brilliance" : theme === "dark" ? "bi bi-moon" : "bi bi-sun";
    document.getElementById("theme-status").innerText = theme === "auto" ? "Auto" : theme === "dark" ? "Dark" : "Light";
}

function initMicaButton() {
    if(document.getElementById("mica-icon")) {
        if (!allowMica) {
            document.getElementById("mica-icon").className = "bi bi-x-lg";
            document.getElementById("mica-status").innerText = "Forbidden";
        } else {
            const enableMica = localStorage.getItem('enable-mica') === null || localStorage.getItem('enable-mica') === 'true';
            document.getElementById("mica-icon").className = enableMica ? "bi bi-windows" : "bi bi-window";
            document.getElementById("mica-status").innerText = enableMica ? "Enabled" : "Disabled";
        }
    }
}

function toggleMenu() {
    document.getElementById("menu").classList.toggle("active");
}

function setMenuEnabled(enabled) {
    document.getElementById("menu").classList.toggle("active", enabled);
}

function escapeHtml(text = "") {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderDiscoverResults(items = []) {
    const resultsEl = document.getElementById("discover-results");
    if (!resultsEl) return;

    if (!items.length) {
        resultsEl.innerHTML = `<div class="text-body-secondary">Keine Ergebnisse gefunden.</div>`;
        return;
    }

    resultsEl.innerHTML = items.map(item => {
        const title = escapeHtml(item.title || item.slug || "Ohne Titel");
        const description = escapeHtml(item.description || "");
        const downloads = Number(item.downloads || 0).toLocaleString("de-DE");
        const categories = Array.isArray(item.categories) ? item.categories.slice(0, 4).join(", ") : "";
        const url = `https://modrinth.com/mod/${encodeURIComponent(item.slug || item.project_id || "")}`;

        return `
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start gap-3">
                        <div>
                            <h5 class="card-title mb-1">${title}</h5>
                            <div class="small text-body-secondary mb-2">${description}</div>
                            <div class="small text-body-secondary">Downloads: ${downloads}</div>
                            ${categories ? `<div class="small text-body-secondary">Tags: ${escapeHtml(categories)}</div>` : ""}
                        </div>
                        <a class="btn btn-sm btn-outline-light" href="${url}" target="_blank" rel="noopener noreferrer">
                            Öffnen
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

let loaded;
async function loadPage(page, menu, params = "") {
    const contentDiv = document.getElementById('content');
    if(params) {
        if (params.startsWith("?")) {
            params.replace("?", "&");
        } else if (!params.startsWith("&")) {
            params += "&";
        }
    }

    if(menu === null||menu === undefined) {
    } else if(menu === true||menu === "true") {
        setMenuEnabled(true);
    } else if(menu === false||menu === "false") {
        setMenuEnabled(false);
    }

    window.history.pushState({}, document.title, window.location.pathname + "?page=" + page + params);
    fetch(page)
        .then(response => response.text())
        .then(html => {
            contentDiv.innerHTML = html;
        })
        .then(() => {

        })
        .catch(error => {
            console.error('Error:', error);
            contentDiv.innerHTML = "<h3 class='p-4 text-danger-emphasis'>" + error + "</h3>";
        });
    const altLoaded = loaded;
    loaded = page;
    if(document.getElementById(page.replace(".html","")+"-button")) {
        document.getElementById(page.replace(".html", "") + "-button").classList.add("active");
    }
    if(altLoaded) {
        document.getElementById(altLoaded.replace(".html","")+"-button").classList.remove("active");
    }
}

initTheme();