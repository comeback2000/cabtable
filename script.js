// State Management
let state = {
    companyName: '',
    currency: '₹',
    stage: 'Idea',
    founders: [],
    esopPool: 10,
    fundingRounds: [],
    totalShares: 10000000, // Fixed total base shares for percentage calculations
    exitValuation: 10000000000
};

// Initial Demo Data
const demoData = {
    companyName: 'Demo Startup Inc.',
    currency: '₹',
    stage: 'Seed',
    esopPool: 10,
    founders: [
        { id: generateId(), name: 'Founder 1', role: 'CEO', ownershipPercent: 40 },
        { id: generateId(), name: 'Founder 2', role: 'CTO', ownershipPercent: 10 },
        { id: generateId(), name: 'Founder 3', role: 'COO', ownershipPercent: 7.5 },
        { id: generateId(), name: 'Founder 4', role: 'CMO', ownershipPercent: 7.5 }
    ],
    fundingRounds: [
        { id: generateId(), name: 'Pre-Seed', raiseAmount: 5000000, preMoney: 45000000, postMoney: 50000000, equitySold: 10 },
        { id: generateId(), name: 'Seed', raiseAmount: 30000000, preMoney: 170000000, postMoney: 200000000, equitySold: 15 }
    ],
    exitValuation: 10000000000
};

// Chart instances
let ownershipChartInstance = null;
let valuationChartInstance = null;

// Utility functions
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function formatCurrency(amount, currencySymbol) {
    if (isNaN(amount)) amount = 0;
    
    // Custom formatting for Indian numbering system (Crores/Lakhs) if INR
    if (currencySymbol === '₹') {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)} Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)} L`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
    }
    
    // USD formatting (Millions/Billions)
    if (amount >= 1000000000) {
        return `$${(amount / 1000000000).toFixed(2)}B`;
    } else if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(2)}M`;
    }
    return `$${amount.toLocaleString('en-US')}`;
}

function formatNumberForInput(num) {
    if (isNaN(num) || num === 0) return '';
    
    if (state.currency === '₹') {
        if (num >= 10000000) {
            let formatted = (num / 10000000).toFixed(2).replace(/\.00$/, '');
            if (formatted.includes('.') && formatted.endsWith('0')) formatted = formatted.slice(0, -1);
            return formatted + 'Cr';
        } else if (num >= 100000) {
            let formatted = (num / 100000).toFixed(2).replace(/\.00$/, '');
            if (formatted.includes('.') && formatted.endsWith('0')) formatted = formatted.slice(0, -1);
            return formatted + 'L';
        }
        return num.toLocaleString('en-IN');
    } else {
        if (num >= 1000000000) {
            let formatted = (num / 1000000000).toFixed(2).replace(/\.00$/, '');
            if (formatted.includes('.') && formatted.endsWith('0')) formatted = formatted.slice(0, -1);
            return formatted + 'B';
        } else if (num >= 1000000) {
            let formatted = (num / 1000000).toFixed(2).replace(/\.00$/, '');
            if (formatted.includes('.') && formatted.endsWith('0')) formatted = formatted.slice(0, -1);
            return formatted + 'M';
        } else if (num >= 1000) {
            let formatted = (num / 1000).toFixed(2).replace(/\.00$/, '');
            if (formatted.includes('.') && formatted.endsWith('0')) formatted = formatted.slice(0, -1);
            return formatted + 'K';
        }
        return num.toLocaleString('en-US');
    }
}

function parseInputToNumber(val) {
    if (typeof val === 'string') {
        val = val.toLowerCase().replace(/,/g, '').trim();
        let multiplier = 1;
        if (val.endsWith('k')) multiplier = 1000;
        else if (val.endsWith('l') || val.endsWith('lac') || val.endsWith('lakh')) multiplier = 100000;
        else if (val.endsWith('m') || val.endsWith('mil')) multiplier = 1000000;
        else if (val.endsWith('cr') || val.endsWith('crore')) multiplier = 10000000;
        else if (val.endsWith('b') || val.endsWith('bil')) multiplier = 1000000000;
        
        let numStr = val.replace(/[a-z\s]/g, '');
        let parsed = parseFloat(numStr) * multiplier;
        return isNaN(parsed) ? 0 : parsed;
    }
    let parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
}

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwWK1BhEZuftpXDg4cicMA5p4KcMhuhA7zDd2EbHqw4OeCVwWu6s5mlV2Fj8fKNtRlV9Q/exec";
let adminSessionPassword = '';
let savedProfilesCache = {};

// Screens: loginOverlay, profileSelectorScreen, createProfileScreen, mainDashboard
function showScreen(screenId) {
    ['profileSelectorScreen','createProfileScreen','mainDashboard'].forEach(id => {
        document.getElementById(id).classList.add('d-none');
    });
    const navDash = document.getElementById('navDashboardActions');
    const navSel  = document.getElementById('navProfileSelectorActions');
    if (screenId === 'mainDashboard') {
        navDash.style.removeProperty('display'); navDash.classList.remove('d-none');
        navSel.classList.add('d-none');
    } else {
        navDash.style.display = 'none';
        navSel.classList.remove('d-none');
    }
    if (screenId) document.getElementById(screenId).classList.remove('d-none');
}

// Initialization & Data Loading
function init() {
    document.getElementById('loginOverlay').classList.remove('d-none');
    setupEventListeners();

    // Theme setup
    const savedTheme = localStorage.getItem('equitySimTheme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// Called after successful login
function afterLogin() {
    document.getElementById('loginOverlay').classList.add('d-none');
    window.showProfileSelector();
}

// Show the profile selector (or create screen if no profiles)
window.showProfileSelector = () => {
    const profiles = JSON.parse(localStorage.getItem('equitySimProfiles') || '{}');
    const names = Object.keys(profiles);
    const container = document.getElementById('profileCardsContainer');

    if (names.length === 0) {
        // No profiles saved — go straight to create screen
        showScreen('createProfileScreen');
        return;
    }

    // Build profile cards
    container.innerHTML = '';
    names.forEach(name => {
        const profileData = profiles[name];
        const stage = profileData.stage || 'N/A';
        const currency = profileData.currency || '₹';
        const founders = (profileData.founders || []).length;
        const rounds = (profileData.fundingRounds || []).length;

        const col = document.createElement('div');
        col.className = 'col-md-4 col-sm-6';
        col.innerHTML = `
            <div class="card glass-card border-0 shadow h-100 p-4" style="cursor:pointer" onclick="window.openProfile('${name}')">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="fw-bold mb-1">${name}</h5>
                        <span class="badge bg-primary">${stage}</span>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation();window.deleteProfile('${name}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div class="text-muted small">
                    <div><i class="fa-solid fa-users me-2 text-info"></i>${founders} Founder(s)</div>
                    <div class="mt-1"><i class="fa-solid fa-money-bill-wave me-2 text-success"></i>${rounds} Funding Round(s)</div>
                </div>
                <div class="mt-3">
                    <button class="btn btn-primary w-100 fw-semibold" onclick="event.stopPropagation();window.openProfile('${name}')">
                        <i class="fa-solid fa-folder-open me-2"></i>Open
                    </button>
                </div>
            </div>`;
        container.appendChild(col);
    });
    showScreen('profileSelectorScreen');
};

// Open a profile from the selector
window.openProfile = (name) => {
    const profiles = JSON.parse(localStorage.getItem('equitySimProfiles') || '{}');
    if (!profiles[name]) return;
    state = profiles[name];
    savedProfilesCache = profiles;
    document.getElementById('navCurrentProfile').textContent = name;
    showScreen('mainDashboard');
    renderAll();
};

// Show create new profile screen
window.createNewProfile = () => {
    document.getElementById('newProfileNameInput').value = '';
    showScreen('createProfileScreen');
};

// Start a brand new blank profile
window.startNewProfile = () => {
    const name = document.getElementById('newProfileNameInput').value.trim();
    if (!name) { alert('Please enter a company name.'); return; }
    state = {
        companyName: name, currency: '₹', stage: 'Idea',
        founders: [], esopPool: 10, fundingRounds: [],
        totalShares: 10000000, exitValuation: 10000000000
    };
    // Save immediately to localStorage
    const profiles = JSON.parse(localStorage.getItem('equitySimProfiles') || '{}');
    profiles[name] = JSON.parse(JSON.stringify(state));
    localStorage.setItem('equitySimProfiles', JSON.stringify(profiles));
    savedProfilesCache = profiles;
    document.getElementById('navCurrentProfile').textContent = name;
    showScreen('mainDashboard');
    renderAll();
};

// Global API Helper
async function apiCall(action, payload = {}) {
    payload.action = action;
    if (action !== 'login') {
        payload.password = adminSessionPassword;
    }
    
    try {
        const response = await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (e) {
        console.error("API Error", e);
        return { status: "error", message: "Network error" };
    }
}

// Save state locally only (re-render)
function saveState() {
    // Just re-render everything, we no longer auto-save to cloud
    renderAll();
}

// Global Save Profile Function
window.forceSaveProfile = () => {
    const cName = document.getElementById('companyName').value.trim() || state.companyName;
    if (!cName) { alert('Please enter a Company Name first.'); return; }
    state.companyName = cName;

    const profiles = JSON.parse(localStorage.getItem('equitySimProfiles') || '{}');
    profiles[cName] = JSON.parse(JSON.stringify(state));
    localStorage.setItem('equitySimProfiles', JSON.stringify(profiles));
    savedProfilesCache = profiles;
    document.getElementById('navCurrentProfile').textContent = cName;

    // Show visual feedback
    const btn = document.querySelector('[onclick="window.forceSaveProfile()"]');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check me-2"></i>Saved!';
    btn.classList.replace('btn-success','btn-outline-success');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.replace('btn-outline-success','btn-success'); }, 2000);

    // Sync to Google Sheets in background (no await, no blocking)
    if (adminSessionPassword) {
        apiCall('save_profile', { profileName: cName, data: state }).catch(()=>{});
    }
};

// refreshProfilesList now just shows the selector screen
window.refreshProfilesList = () => window.showProfileSelector();


// Show toast message
function showToast(message = "Data saved successfully!") {
    const toastEl = document.getElementById('toastSuccess');
    if(toastEl) {
        document.getElementById('toastMessage').textContent = message;
        const toast = new bootstrap.Toast(toastEl, { delay: 2000 });
        toast.show();
    }
}

// Global function to refresh profiles list
window.refreshProfilesList = () => window.showProfileSelector();

// Load a specific profile by name
window.loadProfile = (name) => window.openProfile(name);

// Delete a profile
window.deleteProfile = (name) => {
    if (!confirm(`Delete profile "${name}"?`)) return;
    const profiles = JSON.parse(localStorage.getItem('equitySimProfiles') || '{}');
    delete profiles[name];
    localStorage.setItem('equitySimProfiles', JSON.stringify(profiles));
    savedProfilesCache = profiles;
    if (adminSessionPassword) apiCall('delete_profile', { profileName: name }).catch(()=>{});
    window.showProfileSelector();
};

// Event Listeners Setup
function setupEventListeners() {
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const pwd = document.getElementById('loginPassword').value;
        const btn = document.getElementById('loginBtn');
        const err = document.getElementById('loginError');
        
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Authenticating...';
        btn.disabled = true;
        err.classList.add('d-none');
        
        const res = await apiCall('login', { password: pwd });
        
    if (res.status === 'success') {
            adminSessionPassword = pwd;
            afterLogin();
        } else {
            err.textContent = "Incorrect password";
            err.classList.remove('d-none');
        }
        
        btn.innerHTML = 'Login';
        btn.disabled = false;
    });

    // Auto-refresh profiles every time the Load Profiles modal is opened
    const loadProfileModalEl = document.getElementById('loadProfileModal');
    if (loadProfileModalEl) {
        loadProfileModalEl.addEventListener('show.bs.modal', () => {
            window.refreshProfilesList();
        });
    }

    // Change Password
    document.getElementById('btnChangePassword').addEventListener('click', async () => {
        const oldP = document.getElementById('settingsOldPassword').value;
        const newP = document.getElementById('settingsNewPassword').value;
        const msg = document.getElementById('passwordChangeMsg');
        
        if (oldP !== adminSessionPassword) {
            msg.className = "mt-2 small text-center text-danger";
            msg.textContent = "Current password incorrect";
            msg.classList.remove('d-none');
            return;
        }
        if (newP.length < 4) {
            msg.className = "mt-2 small text-center text-danger";
            msg.textContent = "New password must be at least 4 characters";
            msg.classList.remove('d-none');
            return;
        }
        
        const btn = document.getElementById('btnChangePassword');
        btn.disabled = true;
        btn.innerHTML = 'Updating...';
        
        const res = await apiCall('change_password', { newPassword: newP });
        
        if (res.status === 'success') {
            adminSessionPassword = newP; // update local session
            msg.className = "mt-2 small text-center text-success";
            msg.textContent = "Password changed successfully!";
            document.getElementById('settingsOldPassword').value = '';
            document.getElementById('settingsNewPassword').value = '';
        } else {
            msg.className = "mt-2 small text-center text-danger";
            msg.textContent = "Error: " + res.message;
        }
        msg.classList.remove('d-none');
        btn.disabled = false;
        btn.innerHTML = 'Update Password';
    });

    // Global functions for profile modal actions
    window.loadProfile = (name) => {
        if (savedProfilesCache[name]) {
            state = savedProfilesCache[name];
            renderAll();
            // Close modal
            const modalEl = document.getElementById('loadProfileModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            showToast(`Loaded profile: ${name}`);
        }
    };
    
    window.deleteProfile = async (name) => {
        if (confirm(`Delete profile "${name}"?`)) {
            // Remove from localStorage
            const localProfiles = JSON.parse(localStorage.getItem('equitySimProfiles') || '{}');
            delete localProfiles[name];
            localStorage.setItem('equitySimProfiles', JSON.stringify(localProfiles));
            savedProfilesCache = localProfiles;
            // Also delete from Google Sheets in background
            try { if (adminSessionPassword) apiCall('delete_profile', { profileName: name }); } catch(e){}
            window.refreshProfilesList();
        }
    };

    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('equitySimTheme', newTheme);
        updateThemeIcon(newTheme);
        renderCharts(); // Re-render charts for theme colors
    });

    // Reset Data
    document.getElementById('resetDataBtn').addEventListener('click', () => {
        if(confirm("Are you sure you want to reset all data to the demo defaults?")) {
            localStorage.removeItem('equitySimState');
            state = JSON.parse(JSON.stringify(demoData));
            state.esopPool = 35;
            renderAll();
            saveState();
        }
    });

    // Company Inputs
    document.getElementById('companyName').addEventListener('input', (e) => { state.companyName = e.target.value; saveState(); });
    document.getElementById('currencySelect').addEventListener('change', (e) => { 
        const oldCurrency = state.currency;
        const newCurrency = e.target.value;
        state.currency = newCurrency; 
        
        const exchangeRate = 83.5; // Standard USD to INR exchange rate
        
        if (oldCurrency !== newCurrency) {
            let multiplier = 1;
            if (oldCurrency === '$' && newCurrency === '₹') {
                multiplier = exchangeRate;
            } else if (oldCurrency === '₹' && newCurrency === '$') {
                multiplier = 1 / exchangeRate;
            }
            
            // Convert all monetary values
            state.fundingRounds.forEach(r => {
                r.raiseAmount *= multiplier;
                r.preMoney *= multiplier;
                r.postMoney *= multiplier;
            });
            state.exitValuation *= multiplier;
        }

        updateCurrencySymbols(); 
        renderAll(); 
        saveState(); 
    });
    document.getElementById('stageSelect').addEventListener('change', (e) => { state.stage = e.target.value; saveState(); });
    
    // ESOP
    document.getElementById('esopInput').addEventListener('input', (e) => {
        state.esopPool = parseInputToNumber(e.target.value);
        renderAll();
        saveState();
    });

    // Add Founder
    document.getElementById('addFounderBtn').addEventListener('click', () => {
        state.founders.push({ id: generateId(), name: `Founder ${state.founders.length + 1}`, role: '', ownershipPercent: 0 });
        renderAll();
        saveState();
    });

    // Add Funding Round
    document.getElementById('addRoundBtn').addEventListener('click', () => {
        let defaultName = 'New Round';
        const rounds = state.fundingRounds.length;
        if(rounds === 0) defaultName = 'Pre-Seed';
        else if(rounds === 1) defaultName = 'Seed';
        else if(rounds === 2) defaultName = 'Series A';
        else if(rounds === 3) defaultName = 'Series B';
        
        let defaultPreMoney = 0;
        if(rounds > 0) {
            defaultPreMoney = state.fundingRounds[rounds - 1].postMoney;
        }
        
        state.fundingRounds.push({
            id: generateId(),
            name: defaultName,
            raiseAmount: 0,
            preMoney: defaultPreMoney,
            postMoney: 0,
            equitySold: 0
        });
        renderAll();
        saveState();
    });

    // Auto-Simulate Rounds
    document.getElementById('autoSimulateBtn').addEventListener('click', () => {
        if(state.fundingRounds.length === 0) {
            alert("Please add at least one funding round first.");
            return;
        }
        
        if(state.fundingRounds.length > 1) {
            if(confirm("Do you want to clear all subsequent rounds and simulate a fresh timeline starting from the FIRST round? (Click OK to simulate from Pre-Seed, Cancel to simulate from the last round)")) {
                state.fundingRounds = [state.fundingRounds[0]];
            }
        }
        
        let targetValuation = state.exitValuation;
        let multiplierElement = document.getElementById('simulateMultiplier');
        let multiplier = multiplierElement ? (parseFloat(multiplierElement.value) || 10) : 10;
        
        while (true) {
            let lastRound = state.fundingRounds[state.fundingRounds.length - 1];
            let currentValuation = lastRound.postMoney;
            let currentRaise = lastRound.raiseAmount;
            
            if (currentRaise === 0) {
                alert("Please ensure the last round has a Raise Amount before simulating.");
                break;
            }
            
            if (currentValuation >= targetValuation) {
                break;
            }

            const nextRaise = currentRaise * multiplier;
            const nextEquitySold = 15; // Standard 15% dilution for simulated rounds
            const nextPostMoney = nextRaise / (nextEquitySold / 100);
            const nextPreMoney = nextPostMoney - nextRaise;
            
            let rounds = state.fundingRounds.length;
            let nextName = 'Round ' + (rounds + 1);
            const roundNames = ['Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Series F', 'IPO'];
            if(rounds === 0) nextName = 'Pre-Seed';
            else if(rounds === 1) nextName = 'Seed';
            else if(rounds <= roundNames.length + 1) nextName = roundNames[rounds - 2];
            
            state.fundingRounds.push({
                id: generateId(),
                name: nextName,
                raiseAmount: nextRaise,
                preMoney: nextPreMoney,
                postMoney: nextPostMoney,
                equitySold: nextEquitySold
            });
            
            // Failsafe
            if (state.fundingRounds.length > 12) break;
        }
        
        renderAll();
        saveState();
    });

    // Exit Valuation Input
    document.getElementById('exitValuationInput').addEventListener('input', (e) => {
        state.exitValuation = parseInputToNumber(e.target.value);
        renderExitSimulator();
        saveState();
    });

    // Exit Quick Selects
    document.getElementById('exitQuickSelects').addEventListener('click', (e) => {
        if(e.target.tagName === 'BUTTON') {
            const val = parseInputToNumber(e.target.dataset.val);
            state.exitValuation = val;
            document.getElementById('exitValuationInput').value = val;
            renderExitSimulator();
            saveState();
        }
    });
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggle');
    if (theme === 'dark') {
        btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

function updateCurrencySymbols() {
    document.querySelectorAll('.currency-symbol').forEach(el => el.textContent = state.currency);
}

// Global Render Function
function renderAll() {
    updateCompanyInputs();
    renderFounders();
    
    // Calculation Engine
    const capTableData = calculateCapTable();
    
    renderFundingRounds();
    renderCapTable(capTableData);
    renderSummaryBar(capTableData);
    renderExitSimulator(capTableData);
    renderCharts(capTableData);
}

// Input Updaters
function updateCompanyInputs() {
    document.getElementById('companyName').value = state.companyName;
    document.getElementById('currencySelect').value = state.currency;
    document.getElementById('stageSelect').value = state.stage;
    document.getElementById('esopInput').value = state.esopPool;
    updateCurrencySymbols();
}

function renderFounders() {
    const list = document.getElementById('foundersList');
    list.innerHTML = '';
    
    state.founders.forEach((founder, index) => {
        const div = document.createElement('div');
        div.className = 'row g-2 mb-2 align-items-center fade-in';
        div.innerHTML = `
            <div class="col-4">
                <input type="text" class="form-control form-control-sm" 
                    value="${founder.name.replace(/"/g,'&quot;')}" 
                    placeholder="Name" 
                    data-founder-id="${founder.id}" data-field="name"
                    oninput="window.updateFounderField(this)">
            </div>
            <div class="col-4">
                <input type="text" class="form-control form-control-sm" 
                    value="${founder.role.replace(/"/g,'&quot;')}" 
                    placeholder="Role" 
                    data-founder-id="${founder.id}" data-field="role"
                    oninput="window.updateFounderField(this)">
            </div>
            <div class="col-3">
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control" 
                        value="${founder.ownershipPercent}" 
                        data-founder-id="${founder.id}" data-field="ownershipPercent"
                        onchange="window.updateFounderField(this)" 
                        oninput="window.updateFounderField(this)" 
                        step="0.1" min="0" max="100">
                    <span class="input-group-text">%</span>
                </div>
            </div>
            <div class="col-1 text-end">
                <button class="btn btn-sm btn-outline-danger" onclick="window.removeFounder('${founder.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

// Update a founder field directly from input element (no re-render of founder list)
window.updateFounderField = (inputEl) => {
    const id = inputEl.dataset.founderId;
    const field = inputEl.dataset.field;
    const value = inputEl.value;
    const founder = state.founders.find(f => f.id === id);
    if (!founder) return;
    if (field === 'ownershipPercent') {
        founder[field] = parseFloat(value) || 0;
    } else {
        founder[field] = value;
    }
    // Recalculate and update summary/cap table/charts WITHOUT re-rendering founder inputs
    const capTableData = calculateCapTable();
    renderSummaryBar(capTableData);
    renderCapTable(capTableData);
    renderCharts(capTableData);
};

window.updateFounder = (id, field, value) => {
    const founder = state.founders.find(f => f.id === id);
    if (founder) {
        if (field === 'ownershipPercent') founder[field] = parseInputToNumber(value);
        else founder[field] = value;
        const capTableData = calculateCapTable();
        renderSummaryBar(capTableData);
        renderCapTable(capTableData);
        renderCharts(capTableData);
    }
};

window.removeFounder = (id) => {
    state.founders = state.founders.filter(f => f.id !== id);
    renderAll();
    saveState();
};

function renderFundingRounds() {
    const acc = document.getElementById('fundingAccordion');
    acc.innerHTML = '';
    
    state.fundingRounds.forEach((round, index) => {
        const item = document.createElement('div');
        item.className = 'card bg-light bg-opacity-10 border-light border-opacity-25 mb-3 fade-in';
        item.innerHTML = `
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0 fw-bold text-primary">${round.name}</h6>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="removeRound('${round.id}')" title="Remove Round"><i class="fa-solid fa-times"></i></button>
                </div>
                <div class="row g-2 mb-2">
                    <div class="col-12">
                        <label class="form-label small text-muted mb-1">Round Name</label>
                        <input type="text" class="form-control form-control-sm" value="${round.name}" onchange="updateRound('${round.id}', 'name', this.value)">
                    </div>
                </div>
                <div class="row g-2">
                    <div class="col-6 mb-2">
                        <label class="form-label small text-muted mb-1">Raise Amount</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text">${state.currency}</span>
                            <input type="text" class="form-control" value="${formatNumberForInput(round.raiseAmount)}" onchange="handleRoundInput('${round.id}', 'raiseAmount', this.value)">
                        </div>
                    </div>
                    <div class="col-6 mb-2">
                        <label class="form-label small text-muted mb-1">Target Equity Sold %</label>
                        <div class="input-group input-group-sm">
                            <input type="text" class="form-control" value="${round.equitySold || ''}" onchange="handleRoundInput('${round.id}', 'equitySold', this.value)">
                            <span class="input-group-text">%</span>
                        </div>
                    </div>
                    <div class="col-6 mb-2">
                        <label class="form-label small text-muted mb-1">Pre-Money</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text">${state.currency}</span>
                            <input type="text" class="form-control" value="${formatNumberForInput(round.preMoney)}" onchange="handleRoundInput('${round.id}', 'preMoney', this.value)">
                        </div>
                    </div>
                    <div class="col-6 mb-2">
                        <label class="form-label small text-muted mb-1">Post-Money</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text">${state.currency}</span>
                            <input type="text" class="form-control" value="${formatNumberForInput(round.postMoney)}" onchange="handleRoundInput('${round.id}', 'postMoney', this.value)">
                        </div>
                    </div>
                    <div class="col-6 mt-1">
                        <label class="form-label small text-muted mb-1">Founder Opening Equity</label>
                        <div class="input-group input-group-sm">
                            <input type="text" class="form-control bg-transparent text-info border-secondary border-opacity-25" value="${(round._openingEquity || 0).toFixed(2)}%" readonly tabindex="-1">
                        </div>
                    </div>
                    <div class="col-6 mt-1">
                        <label class="form-label small text-muted mb-1">Founder Closing Equity</label>
                        <div class="input-group input-group-sm">
                            <input type="text" class="form-control bg-transparent text-warning border-secondary border-opacity-25" value="${(round._closingEquity || 0).toFixed(2)}%" readonly tabindex="-1">
                        </div>
                    </div>
                </div>
            </div>
        `;
        acc.appendChild(item);
    });
}

// Complex logic for auto-calculating missing round values
window.handleRoundInput = (id, field, value) => {
    const round = state.fundingRounds.find(r => r.id === id);
    if(!round) return;
    
    let val = parseInputToNumber(value);
    round[field] = val;

    if (field === 'raiseAmount') {
        if (round.equitySold > 0) {
            round.postMoney = round.raiseAmount / (round.equitySold / 100);
            round.preMoney = round.postMoney - round.raiseAmount;
        } else if (round.postMoney > 0) {
            round.preMoney = round.postMoney - round.raiseAmount;
            round.equitySold = (round.raiseAmount / round.postMoney) * 100;
        } else if (round.preMoney > 0) {
            round.postMoney = round.preMoney + round.raiseAmount;
            round.equitySold = (round.raiseAmount / round.postMoney) * 100;
        }
    } else if (field === 'equitySold') {
        if (round.raiseAmount > 0) {
            round.postMoney = round.raiseAmount / (round.equitySold / 100);
            round.preMoney = round.postMoney - round.raiseAmount;
        } else if (round.preMoney > 0) {
            round.postMoney = round.preMoney / (1 - (round.equitySold/100));
            round.raiseAmount = round.postMoney - round.preMoney;
        } else if (round.postMoney > 0) {
            round.raiseAmount = round.postMoney * (round.equitySold / 100);
            round.preMoney = round.postMoney - round.raiseAmount;
        }
    } else if (field === 'preMoney') {
        if (round.equitySold > 0) {
            round.postMoney = round.preMoney / (1 - (round.equitySold/100));
            round.raiseAmount = round.postMoney - round.preMoney;
        } else if (round.raiseAmount > 0) {
            round.postMoney = round.preMoney + round.raiseAmount;
            round.equitySold = (round.raiseAmount / round.postMoney) * 100;
        } else if (round.postMoney > 0) {
            round.raiseAmount = round.postMoney - round.preMoney;
            round.equitySold = (round.raiseAmount / round.postMoney) * 100;
        }
    } else if (field === 'postMoney') {
        if (round.equitySold > 0) {
            round.raiseAmount = round.postMoney * (round.equitySold / 100);
            round.preMoney = round.postMoney - round.raiseAmount;
        } else if (round.raiseAmount > 0) {
            round.preMoney = round.postMoney - round.raiseAmount;
            round.equitySold = (round.raiseAmount / round.postMoney) * 100;
        } else if (round.preMoney > 0) {
            round.raiseAmount = round.postMoney - round.preMoney;
            round.equitySold = (round.raiseAmount / round.postMoney) * 100;
        }
    }

    // Fix NaNs or Infinities
    if(!isFinite(round.postMoney)) round.postMoney = 0;
    if(!isFinite(round.preMoney)) round.preMoney = 0;
    if(!isFinite(round.raiseAmount)) round.raiseAmount = 0;
    if(!isFinite(round.equitySold)) round.equitySold = 0;
    
    // Cap equity at 99.99% to avoid divide by zero errors theoretically
    if(round.equitySold >= 100) round.equitySold = 99.99;

    renderAll();
    saveState();
};

window.updateRound = (id, field, value) => {
    const round = state.fundingRounds.find(r => r.id === id);
    if(round) {
        round[field] = value;
        renderAll();
        saveState();
    }
};

window.removeRound = (id) => {
    state.fundingRounds = state.fundingRounds.filter(r => r.id !== id);
    renderAll();
    saveState();
};

// Core Calculation Engine
function calculateCapTable() {
    let shareholders = [];
    
    // Initial Base Setup (Founding)
    // We normalize founders' input percentages to share the remaining pool after ESOP
    // Or, if users put specific %, we respect it. 
    // Let's assume input % are raw, if they don't sum to 100, they just don't.
    // Usually founders own 100% - ESOP initially. 
    
    let totalFounderInputPct = state.founders.reduce((sum, f) => sum + f.ownershipPercent, 0);
    
    state.founders.forEach(f => {
        shareholders.push({
            id: f.id,
            name: f.name,
            type: 'Founder',
            currentPct: f.ownershipPercent
        });
    });

    shareholders.push({
        id: 'esop',
        name: 'ESOP Pool',
        type: 'ESOP',
        currentPct: state.esopPool
    });

    // We simulate funding rounds chronologically
    let totalDilution = 0;
    let totalRaised = 0;
    let currentValuation = 0; // Final post-money
    let currentPreMoney = 0;
    
    // Store timeline data for charts
    let timeline = [{ round: 'Founding', valuation: 0 }];
    
    let currentFounderEquity = shareholders.filter(s => s.type === 'Founder').reduce((sum, s) => sum + s.currentPct, 0);
    
    state.fundingRounds.forEach(round => {
        let dilutionFactor = 1 - (round.equitySold / 100);
        
        round._openingEquity = currentFounderEquity;
        
        // Dilute all existing shareholders
        shareholders.forEach(s => {
            s.currentPct = s.currentPct * dilutionFactor;
        });
        
        currentFounderEquity = currentFounderEquity * dilutionFactor;
        round._closingEquity = currentFounderEquity;
        
        // Add new investor
        shareholders.push({
            id: round.id,
            name: `${round.name} Investors`,
            type: 'Investor',
            currentPct: round.equitySold
        });

        totalRaised += round.raiseAmount;
        currentValuation = round.postMoney;
        currentPreMoney = round.preMoney;
        totalDilution = 100 - ((100 - totalDilution) * dilutionFactor);
        
        timeline.push({ round: round.name, valuation: currentValuation });
    });

    return {
        shareholders,
        totalRaised,
        currentValuation,
        currentPreMoney,
        totalDilution,
        timeline
    };
}

function renderSummaryBar(data) {
    let displayValuation = formatCurrency(data.currentValuation, state.currency);
    
    // If no funding rounds exist, show estimated benchmark based on stage
    if (state.fundingRounds.length === 0) {
        if (state.currency === '₹') {
            if (state.stage === 'Idea') displayValuation = '₹2-5 Cr (Est.)';
            else if (state.stage === 'Prototype') displayValuation = '₹5-10 Cr (Est.)';
            else if (state.stage === 'Validation') displayValuation = '₹10-20 Cr (Est.)';
            else if (state.stage === 'Revenue') displayValuation = '₹20+ Cr (Est.)';
        } else {
            if (state.stage === 'Idea') displayValuation = '$250K-600K (Est.)';
            else if (state.stage === 'Prototype') displayValuation = '$600K-1.2M (Est.)';
            else if (state.stage === 'Validation') displayValuation = '$1.2M-2.5M (Est.)';
            else if (state.stage === 'Revenue') displayValuation = '$2.5M+ (Est.)';
        }
    }

    document.getElementById('sumCompanyVal').textContent = displayValuation;
    document.getElementById('sumTotalRaised').textContent = formatCurrency(data.totalRaised, state.currency);
    
    // Calculate total founder ownership
    let founderOwnership = 0;
    data.shareholders.forEach(sh => {
        if (sh.type === 'Founder') founderOwnership += sh.currentPct;
    });
    
    document.getElementById('sumFounderOwnership').textContent = `${founderOwnership.toFixed(1)}%`;
    document.getElementById('sumDilution').textContent = `${data.totalDilution.toFixed(1)}%`;
}

function renderCapTable(data) {
    const tbody = document.getElementById('capTableBody');
    tbody.innerHTML = '';
    
    let calcTotalShares = 0;
    let calcTotalPct = 0;
    
    data.shareholders.sort((a,b) => b.currentPct - a.currentPct).forEach(sh => {
        let shares = Math.round(state.totalShares * (sh.currentPct / 100));
        let val = data.currentValuation * (sh.currentPct / 100);
        
        calcTotalShares += shares;
        calcTotalPct += sh.currentPct;
        
        let badge = '';
        if(sh.type === 'Founder') badge = '<span class="badge bg-primary">Founder</span>';
        else if(sh.type === 'ESOP') badge = '<span class="badge bg-warning text-dark">ESOP</span>';
        else badge = '<span class="badge bg-success">Investor</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="fw-semibold">${sh.name}</div>
                <div class="small">${badge}</div>
            </td>
            <td class="text-end font-monospace">${shares.toLocaleString()}</td>
            <td class="text-end fw-bold">${sh.currentPct.toFixed(2)}%</td>
            <td class="text-end text-success">${formatCurrency(val, state.currency)}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('ctTotalShares').textContent = calcTotalShares.toLocaleString();
    document.getElementById('ctTotalValue').textContent = formatCurrency(data.currentValuation, state.currency);
}

function renderExitSimulator(data = null) {
    if(!data) data = calculateCapTable();
    
    const exitVal = state.exitValuation;
    const tbody = document.getElementById('exitTableBody');
    tbody.innerHTML = '';
    
    let totalFounderWealth = 0;
    
    data.shareholders.forEach(sh => {
        let payout = exitVal * (sh.currentPct / 100);
        if(sh.type === 'Founder') totalFounderWealth += payout;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${sh.name} <small class="opacity-50">(${sh.type})</small></td>
            <td class="text-end">${sh.currentPct.toFixed(2)}%</td>
            <td class="text-end fw-bold">${formatCurrency(payout, state.currency)}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('founderWealthDisplay').textContent = formatCurrency(totalFounderWealth, state.currency);
}

function renderCharts(data) {
    if(!data) data = calculateCapTable();
    
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    
    // Prepare Ownership Data
    const labels = data.shareholders.map(s => s.name);
    const chartData = data.shareholders.map(s => s.currentPct);
    const bgColors = data.shareholders.map(s => {
        if(s.type === 'Founder') return '#6366f1'; // Primary
        if(s.type === 'ESOP') return '#f59e0b'; // Warning
        return '#10b981'; // Success
    });

    // Ownership Chart
    const ctxOwn = document.getElementById('ownershipChart').getContext('2d');
    if(ownershipChartInstance) ownershipChartInstance.destroy();
    
    ownershipChartInstance = new Chart(ctxOwn, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: chartData,
                backgroundColor: bgColors,
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: textColor, font: { family: 'Inter' } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.raw.toFixed(2)}%`
                    }
                }
            }
        }
    });

    // Valuation Chart (Bar/Line)
    const ctxVal = document.getElementById('valuationChart').getContext('2d');
    if(valuationChartInstance) valuationChartInstance.destroy();
    
    const timeLabels = data.timeline.map(t => t.round);
    const valData = data.timeline.map(t => t.valuation);

    valuationChartInstance = new Chart(ctxVal, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Post-Money Valuation',
                data: valData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#6366f1',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        callback: (val) => {
                            if(val >= 10000000) return (val/10000000).toFixed(0) + 'Cr';
                            if(val >= 1000000) return (val/1000000).toFixed(0) + 'M';
                            return val;
                        }
                    },
                    grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` Val: ${formatCurrency(ctx.raw, state.currency)}`
                    }
                }
            }
        }
    });
}

function showToast() {
    const toastEl = document.getElementById('toastSuccess');
    if(toastEl) {
        const toast = new bootstrap.Toast(toastEl, { delay: 1500 });
        toast.show();
    }
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
