// State Management
let state = {
    companyName: '',
    currency: '₹',
    stage: 'Idea',
    founders: [],
    esopPool: 10,
    fundingRounds: [],
    totalShares: 10000000, // Starting outstanding shares at founding
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

// Session & Auth Management
let isGuestMode = false;
let userGmailID = '';
let mockOtpCode = '';

// Helper to partition user storage
function getProfilesStorageKey() {
    return isGuestMode ? 'equitySimProfiles_guest' : `equitySimProfiles_${userGmailID}`;
}

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

// Helper to reset login screen UI
function resetLoginOverlay() {
    const stepGmail = document.getElementById('loginStepGmail');
    const stepOtp = document.getElementById('loginStepOtp');
    const stepSetPassword = document.getElementById('loginStepSetPassword');
    const stepEnterPassword = document.getElementById('loginStepEnterPassword');
    
    if (stepGmail) stepGmail.classList.remove('d-none');
    if (stepOtp) stepOtp.classList.add('d-none');
    if (stepSetPassword) stepSetPassword.classList.add('d-none');
    if (stepEnterPassword) stepEnterPassword.classList.add('d-none');
    
    const gmailInput = document.getElementById('loginGmailInput');
    const otpInput = document.getElementById('loginOtpInput');
    const newPasswordInput = document.getElementById('loginNewPasswordInput');
    const passwordInput = document.getElementById('loginPasswordInput');
    
    if (gmailInput) gmailInput.value = '';
    if (otpInput) otpInput.value = '';
    if (newPasswordInput) newPasswordInput.value = '';
    if (passwordInput) passwordInput.value = '';
    
    const gmailErr = document.getElementById('gmailError');
    const otpErr = document.getElementById('otpError');
    const setPasswordErr = document.getElementById('setPasswordError');
    const passwordErr = document.getElementById('passwordError');
    
    if (gmailErr) gmailErr.classList.add('d-none');
    if (otpErr) otpErr.classList.add('d-none');
    if (setPasswordErr) setPasswordErr.classList.add('d-none');
    if (passwordErr) passwordErr.classList.add('d-none');
}

// Initialization & Data Loading
function init() {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.classList.remove('d-none');
    
    // Hide guest mode banner at start
    const guestBanner = document.getElementById('guestModeBanner');
    if (guestBanner) guestBanner.classList.add('d-none');
    
    resetLoginOverlay();
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

// Show the profile selector (fetches from Google Sheets first, fallback to localStorage)
window.showProfileSelector = async () => {
    if (isGuestMode) {
        alert("Please log in with a Gmail account to view and manage company profiles.");
        window.exitGuestMode();
        return;
    }

    const container = document.getElementById('profileCardsContainer');
    if (!container) return;

    // Show a loading spinner first in the container
    container.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Fetching profiles from Google Sheets...</p>
        </div>
    `;
    showScreen('profileSelectorScreen');

    let profiles = {};
    let isOffline = false;

    // Try fetching from Google Sheets
    if (adminSessionPassword) {
        try {
            const res = await apiCall('get_all');
            if (res && res.status === 'success' && res.profiles) {
                profiles = res.profiles;
                // Sync local storage with Google Sheets data
                localStorage.setItem(getProfilesStorageKey(), JSON.stringify(profiles));
            } else {
                isOffline = true;
            }
        } catch (e) {
            console.error("Failed to fetch profiles from Cloud", e);
            isOffline = true;
        }
    } else {
        isOffline = true;
    }

    // Fallback to localStorage if offline or fetch failed
    if (isOffline) {
        profiles = JSON.parse(localStorage.getItem(getProfilesStorageKey()) || '{}');
    }

    savedProfilesCache = profiles;
    const names = Object.keys(profiles);

    if (names.length === 0) {
        // No profiles saved — go straight to create screen
        showScreen('createProfileScreen');
        return;
    }

    // Build profile cards
    container.innerHTML = '';
    
    if (isOffline && adminSessionPassword) {
        // Show an offline warning badge
        const warningDiv = document.createElement('div');
        warningDiv.className = 'col-12 mb-3';
        warningDiv.innerHTML = `
            <div class="alert alert-warning border-0 bg-warning bg-opacity-10 text-warning d-flex align-items-center mb-0" role="alert">
                <i class="fa-solid fa-triangle-exclamation me-2"></i>
                <div>Offline Mode: Displaying locally cached profiles. Connect to the internet to sync with Google Sheets.</div>
            </div>
        `;
        container.appendChild(warningDiv);
    }

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
};

// Open a profile from the selector
window.openProfile = (name) => {
    const profiles = JSON.parse(localStorage.getItem(getProfilesStorageKey()) || '{}');
    if (!profiles[name]) return;
    state = profiles[name];
    savedProfilesCache = profiles;
    document.getElementById('navCurrentProfile').textContent = name;
    showScreen('mainDashboard');
    renderAll();
};

// Show create new profile screen
window.createNewProfile = () => {
    if (isGuestMode) {
        alert("Please log in with a Gmail account to view and manage company profiles.");
        window.exitGuestMode();
        return;
    }
    document.getElementById('newProfileNameInput').value = '';
    showScreen('createProfileScreen');
};

// Start a brand new blank profile
window.startNewProfile = async () => {
    if (isGuestMode) {
        alert("Please log in with a Gmail account to view and manage company profiles.");
        window.exitGuestMode();
        return;
    }
    const name = document.getElementById('newProfileNameInput').value.trim();
    if (!name) { alert('Please enter a company name.'); return; }
    
    // Check local/cached profiles to avoid unintended overwrites
    const localProfiles = JSON.parse(localStorage.getItem(getProfilesStorageKey()) || '{}');
    if (localProfiles[name]) {
        if (!confirm(`A profile named "${name}" already exists. Overwrite it?`)) return;
    }

    state = {
        companyName: name, currency: '₹', stage: 'Idea',
        founders: [], esopPool: 10, fundingRounds: [],
        totalShares: 10000000, exitValuation: 10000000000
    };

    // Save locally immediately
    localProfiles[name] = JSON.parse(JSON.stringify(state));
    localStorage.setItem(getProfilesStorageKey(), JSON.stringify(localProfiles));
    savedProfilesCache = localProfiles;
    document.getElementById('navCurrentProfile').textContent = name;
    
    showScreen('mainDashboard');
    renderAll();

    // Sync to cloud in background
    if (adminSessionPassword) {
        try {
            await apiCall('save_profile', { profileName: name, data: state });
        } catch (e) {
            console.warn("Background cloud sync failed on creation", e);
        }
    }
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
    renderAll();
}

// Global Save Profile Function
window.forceSaveProfile = async () => {
    if (isGuestMode) {
        alert("You are in Guest Mode. Please log in with a Gmail account to save your company profile.");
        window.exitGuestMode();
        return;
    }
    const cName = document.getElementById('companyName').value.trim() || state.companyName;
    if (!cName) { alert('Please enter a Company Name first.'); return; }
    state.companyName = cName;

    // Show visual saving feedback on the button
    const btn = document.querySelector('[onclick="window.forceSaveProfile()"]');
    const orig = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        btn.disabled = true;
    }

    // 1. Save to local storage cache immediately
    const profiles = JSON.parse(localStorage.getItem(getProfilesStorageKey()) || '{}');
    profiles[cName] = JSON.parse(JSON.stringify(state));
    localStorage.setItem(getProfilesStorageKey(), JSON.stringify(profiles));
    savedProfilesCache = profiles;
    document.getElementById('navCurrentProfile').textContent = cName;

    // 2. Save to Google Sheets (awaited so we can report cloud save success)
    try {
        if (adminSessionPassword) {
            const res = await apiCall('save_profile', { profileName: cName, data: state });
            if (res && res.status === 'success') {
                if (btn) {
                    btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up me-2"></i>Saved to Cloud!';
                    btn.classList.replace('btn-success', 'btn-outline-success');
                    setTimeout(() => {
                        btn.innerHTML = orig;
                        btn.classList.replace('btn-outline-success', 'btn-success');
                        btn.disabled = false;
                    }, 2000);
                }
            } else {
                alert("Saved locally, but Cloud sync failed: " + (res.message || 'Unknown response'));
                if (btn) {
                    btn.innerHTML = orig;
                    btn.disabled = false;
                }
            }
        } else {
            alert("Saved locally. Log in to sync with Cloud.");
            if (btn) {
                btn.innerHTML = orig;
                btn.disabled = false;
            }
        }
    } catch (err) {
        alert("Saved locally. Cloud sync failed (Network error).");
        if (btn) {
            btn.innerHTML = orig;
            btn.disabled = false;
        }
    }
};

// refreshProfilesList now just shows the selector screen
window.refreshProfilesList = () => window.showProfileSelector();

// Show toast message
function showToast(message = "Data saved successfully!") {
    const toastEl = document.getElementById('toastSuccess');
    if(toastEl) {
        const toastMsg = document.getElementById('toastMessage');
        if (toastMsg) toastMsg.textContent = message;
        const toast = new bootstrap.Toast(toastEl, { delay: 2000 });
        toast.show();
    }
}

// Global function to refresh profiles list
window.refreshProfilesList = () => window.showProfileSelector();

// Load a specific profile by name
window.loadProfile = (name) => window.openProfile(name);

// Delete a profile (awaits cloud deletion first to avoid race conditions)
window.deleteProfile = async (name) => {
    if (isGuestMode) {
        alert("Please log in with a Gmail account to view and manage company profiles.");
        window.exitGuestMode();
        return;
    }
    if (!confirm(`Are you sure you want to permanently delete profile "${name}"?`)) return;

    try {
        if (adminSessionPassword) {
            // Await the deletion on Google Sheets
            const res = await apiCall('delete_profile', { profileName: name });
            if (res && res.status !== 'success') {
                alert("Failed to delete from Cloud: " + (res.message || "Unknown error"));
                return;
            }
        }
        
        // Successfully deleted from Sheets, now update local storage
        const profiles = JSON.parse(localStorage.getItem(getProfilesStorageKey()) || '{}');
        delete profiles[name];
        localStorage.setItem(getProfilesStorageKey(), JSON.stringify(profiles));
        savedProfilesCache = profiles;

        alert(`Profile "${name}" deleted successfully.`);
        window.showProfileSelector();
    } catch (e) {
        alert("Failed to delete profile due to a network error.");
        console.error(e);
    }
};

// Event Listeners Setup
function setupEventListeners() {
    // Step 1: Gmail Input -> Send OTP
    document.getElementById('loginSendOtpBtn')?.addEventListener('click', () => {
        const gmailInput = document.getElementById('loginGmailInput').value.trim();
        const err = document.getElementById('gmailError');
        err.classList.add('d-none');

        // Regex for Gmail addresses only
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!gmailRegex.test(gmailInput)) {
            err.textContent = "Only Gmail accounts are supported for registration.";
            err.classList.remove('d-none');
            return;
        }

        userGmailID = gmailInput;

        // Generate mock OTP
        mockOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
        document.getElementById('mockOtpText').textContent = mockOtpCode;

        // Transition to step 2
        document.getElementById('loginStepGmail').classList.add('d-none');
        document.getElementById('loginStepOtp').classList.remove('d-none');
        document.getElementById('otpError').classList.add('d-none');
        document.getElementById('loginOtpInput').value = '';
        
        // Show success alert
        showToast("OTP sent to your Gmail ID!");
    });

    // Step 2: Verify OTP
    document.getElementById('loginVerifyOtpBtn')?.addEventListener('click', () => {
        const otpInput = document.getElementById('loginOtpInput').value.trim();
        const err = document.getElementById('otpError');
        err.classList.add('d-none');

        if (otpInput !== mockOtpCode && otpInput !== '123456') {
            err.textContent = "Incorrect OTP. Please enter the code shown in the box.";
            err.classList.remove('d-none');
            return;
        }

        // OTP verified! Now check if user exists
        const users = JSON.parse(localStorage.getItem('equitySimUsers') || '{}');
        document.getElementById('loginStepOtp').classList.add('d-none');

        if (users[userGmailID]) {
            // User exists -> Ask for password
            document.getElementById('loginStepEnterPassword').classList.remove('d-none');
            document.getElementById('loginEnterPasswordEmail').textContent = userGmailID;
            document.getElementById('loginPasswordInput').value = '';
            document.getElementById('passwordError').classList.add('d-none');
        } else {
            // User does not exist -> Create password
            document.getElementById('loginStepSetPassword').classList.remove('d-none');
            document.getElementById('loginNewPasswordInput').value = '';
            document.getElementById('setPasswordError').classList.add('d-none');
        }
    });

    // Step 3: Set Password
    document.getElementById('loginRegisterBtn')?.addEventListener('click', () => {
        const newPassword = document.getElementById('loginNewPasswordInput').value;
        const err = document.getElementById('setPasswordError');
        err.classList.add('d-none');

        if (newPassword.length < 4) {
            err.textContent = "Password must be at least 4 characters.";
            err.classList.remove('d-none');
            return;
        }

        // Register user
        const users = JSON.parse(localStorage.getItem('equitySimUsers') || '{}');
        users[userGmailID] = newPassword;
        localStorage.setItem('equitySimUsers', JSON.stringify(users));

        // Log in
        isGuestMode = false;
        adminSessionPassword = userGmailID; // Use Gmail ID as the key for sheets partitioning
        afterLogin();
    });

    // Step 4: Submit Password
    document.getElementById('loginSubmitPasswordBtn')?.addEventListener('click', () => {
        const passwordInput = document.getElementById('loginPasswordInput').value;
        const err = document.getElementById('passwordError');
        err.classList.add('d-none');

        const users = JSON.parse(localStorage.getItem('equitySimUsers') || '{}');
        const correctPassword = users[userGmailID];

        if (passwordInput !== correctPassword) {
            err.textContent = "Incorrect password.";
            err.classList.remove('d-none');
            return;
        }

        // Log in
        isGuestMode = false;
        adminSessionPassword = userGmailID; // Use Gmail ID as sheets partitioning key
        afterLogin();
    });

    // Theme Toggle Handlers
    const handleThemeToggle = () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('equitySimTheme', newTheme);
        updateThemeIcon(newTheme);
        renderCharts(); // Re-render charts for theme colors
    };

    document.getElementById('themeToggle')?.addEventListener('click', handleThemeToggle);
    document.getElementById('themeToggle2')?.addEventListener('click', handleThemeToggle);

    // Company Inputs
    document.getElementById('companyName')?.addEventListener('input', (e) => { 
        state.companyName = e.target.value; 
        saveState(); 
    });
    
    document.getElementById('currencySelect')?.addEventListener('change', (e) => { 
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
    
    document.getElementById('stageSelect')?.addEventListener('change', (e) => {
        state.stage = e.target.value;
        
        // Auto-set the first funding round pre-money if no rounds exist yet
        if (state.fundingRounds.length === 0) {
            const defaultVal = getDefaultValuation(state.stage);
            if (defaultVal) {
                state.suggestedPreMoney = defaultVal;
            }
        }
        saveState();
        renderAll();
    });
    
    // ESOP
    document.getElementById('esopInput')?.addEventListener('input', (e) => {
        state.esopPool = parseInputToNumber(e.target.value);
        renderAll();
        saveState();
    });
}

// Global functions for Step navigation in Login Overlay
window.backToGmailInput = () => {
    resetLoginOverlay();
};

window.resendOtp = () => {
    if (!userGmailID) return;
    mockOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    document.getElementById('mockOtpText').textContent = mockOtpCode;
    showToast("A new OTP has been sent!");
};

window.forgotPassword = () => {
    // Forgot password is just a reset. They verify via OTP and then set a new password.
    document.getElementById('loginStepEnterPassword').classList.add('d-none');
    document.getElementById('loginStepOtp').classList.remove('d-none');
    // Generate new OTP
    mockOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    document.getElementById('mockOtpText').textContent = mockOtpCode;
    document.getElementById('loginOtpInput').value = '';
    document.getElementById('otpError').classList.add('d-none');
    showToast("Verification code sent for password reset.");
};

window.enterGuestMode = () => {
    isGuestMode = true;
    userGmailID = 'Guest';
    adminSessionPassword = '';
    
    document.getElementById('loginOverlay').classList.add('d-none');
    document.getElementById('guestModeBanner').classList.remove('d-none');
    
    // Hide standard save button feedback and options or adjust nav
    document.getElementById('navCurrentProfile').textContent = "Guest Mode";
    
    // Update navbar layout
    const saveBtn = document.querySelector('[onclick="window.forceSaveProfile()"]');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2"></i>Log In';
        saveBtn.className = 'btn btn-warning shadow-sm fw-bold px-3';
    }
    
    // Load demo data
    state = JSON.parse(JSON.stringify(demoData));
    showScreen('mainDashboard');
    renderAll();
};

window.exitGuestMode = () => {
    isGuestMode = false;
    userGmailID = '';
    adminSessionPassword = '';
    
    document.getElementById('guestModeBanner').classList.add('d-none');
    document.getElementById('mainDashboard').classList.add('d-none');
    
    // Restore save button in navbar
    const saveBtn = document.querySelector('[onclick="window.forceSaveProfile()"]');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i>Save';
        saveBtn.className = 'btn btn-success shadow-sm fw-bold px-3';
    }
    
    init();
};

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

// Global Add Founder (called via inline onclick)
window.addFounder = () => {
    state.founders.push({ id: generateId(), name: `Founder ${state.founders.length + 1}`, role: '', ownershipPercent: 0 });
    renderAll();
    saveState();
};

// Global Add Funding Round
window.addRound = () => {
    let defaultName = 'New Round';
    const rounds = state.fundingRounds.length;
    if (rounds === 0) defaultName = 'Pre-Seed';
    else if (rounds === 1) defaultName = 'Seed';
    else if (rounds === 2) defaultName = 'Series A';
    else if (rounds === 3) defaultName = 'Series B';
    else if (rounds === 4) defaultName = 'Series C';

    // Set a sensible default pre-money based on round name
    const roundValuations = {
        'Pre-Seed': 30000000,
        'Seed':     150000000,
        'Series A': 500000000,
        'Series B': 2000000000,
        'Series C': 8000000000,
    };
    // For the first round, use stage-based default if INR
    let defaultPreMoney = roundValuations[defaultName] || 50000000;
    if (rounds === 0 && state.currency === '₹') {
        const stageDefault = getDefaultValuation(state.stage);
        if (stageDefault) defaultPreMoney = stageDefault;
    }

    state.fundingRounds.push({
        id: generateId(), name: defaultName,
        raiseAmount: 0, preMoney: defaultPreMoney,
        postMoney: defaultPreMoney, equitySold: 0
    });
    renderAll();
    saveState();
};

// Global Auto-Simulate
window.autoSimulate = () => {
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
};

// Calculate and update remaining equity dynamically
window.updateRemainingEquity = () => {
    const totalFoundersEquity = state.founders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0);
    const esop = state.esopPool || 0;
    const remaining = 100 - (totalFoundersEquity + esop);
    
    const badge = document.getElementById('remainingEquityBadge');
    if (badge) {
        badge.textContent = `${remaining.toFixed(1)}%`;
        if (remaining < 0) {
            badge.className = 'badge bg-danger fs-6';
        } else if (remaining === 0) {
            badge.className = 'badge bg-warning fs-6';
        } else {
            badge.className = 'badge bg-info fs-6';
        }
    }
};

// Stage → default pre-money valuation map (Indian rupees)
const STAGE_VALUATIONS = {
    'Idea':       { min: 20000000,  max: 50000000,  label: '₹2–5 Cr (Est.)' },
    'Prototype':  { min: 50000000,  max: 100000000, label: '₹5–10 Cr (Est.)' },
    'Validation': { min: 100000000, max: 200000000, label: '₹10–20 Cr (Est.)' },
    'Pre-Seed':   { min: 200000000, max: 500000000, label: '₹20–50 Cr (Est.)' },
    'Seed':       { min: 500000000, max: 1500000000,label: '₹50–150 Cr (Est.)' },
    'Series A':   { min: 1500000000,max: 5000000000,label: '₹150–500 Cr (Est.)' },
    'Series B':   { min: 5000000000,max: 15000000000,label: '₹500Cr–1500Cr (Est.)' },
    'Series C':   { min: 10000000000,max: 50000000000,label: '₹1000Cr+ (Est.)' },
    'IPO':        { min: 50000000000,max: 200000000000,label: '₹5000Cr+ (Est.)' },
};

function getDefaultValuation(stage) {
    const sv = STAGE_VALUATIONS[stage];
    if (!sv) return null;
    return Math.round((sv.min + sv.max) / 2);
}

function getValuationLabel(stage) {
    const sv = STAGE_VALUATIONS[stage];
    return sv ? sv.label : null;
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

    window.updateRemainingEquity();
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
    window.updateRemainingEquity();
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
// Core Calculation Engine
function calculateCapTable() {
    let shareholders = [];
    
    // Initial Base Setup (Founding)
    let baseShares = 10000000; // 10 million base shares
    
    // Calculate founder shares
    state.founders.forEach(f => {
        let founderShares = Math.round(baseShares * ((f.ownershipPercent || 0) / 100));
        shareholders.push({
            id: f.id,
            name: f.name || 'Founder',
            type: 'Founder',
            shares: founderShares,
            investment: 0,
            boughtPrice: 0,
            currentPct: f.ownershipPercent || 0
        });
    });
    
    // Calculate ESOP shares
    let esopShares = Math.round(baseShares * ((state.esopPool || 0) / 100));
    shareholders.push({
        id: 'esop',
        name: 'ESOP Pool',
        type: 'ESOP',
        shares: esopShares,
        investment: 0,
        boughtPrice: 0,
        currentPct: state.esopPool || 0
    });
    
    // Calculate Unallocated / Remaining Equity shares if any
    let allocatedPercent = state.founders.reduce((sum, f) => sum + (f.ownershipPercent || 0), 0) + (state.esopPool || 0);
    let remainingPercent = 100 - allocatedPercent;
    if (remainingPercent > 0) {
        let remainingShares = Math.round(baseShares * (remainingPercent / 100));
        shareholders.push({
            id: 'unallocated',
            name: 'Unallocated Equity',
            type: 'Unallocated',
            shares: remainingShares,
            investment: 0,
            boughtPrice: 0,
            currentPct: remainingPercent
        });
    }
    
    let totalSharesOutstanding = baseShares;
    let totalRaised = 0;
    let currentValuation = 0;
    let currentPreMoney = 0;
    
    // Estimate starting valuation based on stage default
    let initialValuation = getDefaultValuation(state.stage) || 30000000; // fallback to 3 Cr
    currentValuation = initialValuation;
    
    // Store timeline for chart
    let timeline = [{ 
        round: 'Founding', 
        valuation: initialValuation,
        sharePrice: initialValuation / baseShares 
    }];
    
    // Process funding rounds chronologically
    state.fundingRounds.forEach((round, index) => {
        // Share Price = Pre-Money Valuation / Total Shares Outstanding before the round
        let sharePrice = round.preMoney / totalSharesOutstanding;
        if (!isFinite(sharePrice) || sharePrice <= 0) {
            sharePrice = 0.01; // fallback
        }
        
        // Issue new shares to the round's investor
        let newShares = round.raiseAmount / sharePrice;
        if (!isFinite(newShares) || newShares < 0) {
            newShares = 0;
        }
        
        newShares = Math.round(newShares);
        
        // Add investor to the list
        shareholders.push({
            id: round.id,
            name: `${round.name} Investors`,
            type: 'Investor',
            shares: newShares,
            investment: round.raiseAmount,
            boughtPrice: sharePrice,
            currentPct: 0
        });
        
        totalSharesOutstanding += newShares;
        totalRaised += round.raiseAmount;
        currentValuation = round.postMoney;
        currentPreMoney = round.preMoney;
        
        round._sharePrice = sharePrice;
        round._newSharesIssued = newShares;
        
        timeline.push({
            round: round.name,
            valuation: currentValuation,
            sharePrice: currentValuation / totalSharesOutstanding
        });
    });
    
    // Calculate current share price (based on latest valuation and total outstanding shares)
    let currentSharePrice = currentValuation / totalSharesOutstanding;
    if (!isFinite(currentSharePrice) || currentSharePrice <= 0) {
        currentSharePrice = 0.01;
    }
    
    // Update ownership percentages and values for all shareholders
    shareholders.forEach(sh => {
        sh.currentPct = (sh.shares / totalSharesOutstanding) * 100;
        sh.currentPrice = currentSharePrice;
        sh.currentValue = sh.shares * currentSharePrice;
        
        if (sh.type === 'Investor') {
            sh.gainLossPercent = sh.boughtPrice > 0 ? ((currentSharePrice - sh.boughtPrice) / sh.boughtPrice) * 100 : 0;
        } else {
            sh.gainLossPercent = null;
        }
    });
    
    // Calculate total dilution
    let totalFounderShares = shareholders.filter(s => s.type === 'Founder').reduce((sum, s) => sum + s.shares, 0);
    let totalESOPShares = shareholders.filter(s => s.type === 'ESOP').reduce((sum, s) => sum + s.shares, 0);
    let founderAndESOPPct = ((totalFounderShares + totalESOPShares) / totalSharesOutstanding) * 100;
    let totalDilution = 100 - founderAndESOPPct;
    
    return {
        shareholders,
        totalRaised,
        currentValuation,
        currentPreMoney,
        totalDilution,
        timeline,
        currentSharePrice,
        totalSharesOutstanding
    };
}

function renderAll() {
    updateCompanyInputs();
    renderFounders();
    
    const capTableData = calculateCapTable();
    
    renderFundingRounds();
    renderCapTable(capTableData);
    renderSummaryBar(capTableData);
    renderCharts(capTableData);
}

function renderSummaryBar(data) {
    let displayValuation = formatCurrency(data.currentValuation, state.currency);
    
    // If no funding rounds exist, show estimated benchmark based on stage
    if (state.fundingRounds.length === 0) {
        if (state.currency === '₹') {
            const label = getValuationLabel(state.stage);
            if (label) displayValuation = label;
        } else {
            if (state.stage === 'Idea') displayValuation = '$250K–600K (Est.)';
            else if (state.stage === 'Prototype') displayValuation = '$600K–1.2M (Est.)';
            else if (state.stage === 'Validation') displayValuation = '$1.2M–2.5M (Est.)';
            else if (state.stage === 'Pre-Seed') displayValuation = '$1M–3M (Est.)';
            else if (state.stage === 'Seed') displayValuation = '$5M–15M (Est.)';
            else if (state.stage === 'Series A') displayValuation = '$15M–50M (Est.)';
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
    
    // Set share price in summary
    const sharePriceEl = document.getElementById('sumSharePrice');
    if (sharePriceEl) {
        sharePriceEl.textContent = formatCurrency(data.currentSharePrice, state.currency);
    }
}

function renderCapTable(data) {
    const tbody = document.getElementById('capTableBody');
    tbody.innerHTML = '';
    
    let calcTotalShares = 0;
    let calcTotalPct = 0;
    let calcTotalInvestment = 0;
    
    data.shareholders.sort((a,b) => b.currentPct - a.currentPct).forEach(sh => {
        calcTotalShares += sh.shares;
        calcTotalPct += sh.currentPct;
        
        let badge = '';
        if(sh.type === 'Founder') badge = '<span class="badge bg-primary">Founder</span>';
        else if(sh.type === 'ESOP') badge = '<span class="badge bg-warning text-dark">ESOP</span>';
        else if(sh.type === 'Unallocated') badge = '<span class="badge bg-secondary">Unallocated</span>';
        else badge = '<span class="badge bg-success">Investor</span>';

        let investmentStr = '—';
        let boughtPriceStr = '—';
        let gainLossStr = '—';
        let gainClass = 'gain-neutral';
        
        if (sh.type === 'Investor') {
            investmentStr = formatCurrency(sh.investment, state.currency);
            calcTotalInvestment += sh.investment;
            boughtPriceStr = formatCurrency(sh.boughtPrice, state.currency);
            
            const gain = sh.gainLossPercent;
            const sign = gain >= 0 ? '+' : '';
            gainLossStr = `${sign}${gain.toFixed(2)}%`;
            if (gain > 0) gainClass = 'gain-positive';
            else if (gain < 0) gainClass = 'gain-negative';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="fw-semibold">${sh.name}</div>
                <div class="small">${badge}</div>
            </td>
            <td class="text-end font-monospace">${sh.shares.toLocaleString()}</td>
            <td class="text-end fw-bold">${sh.currentPct.toFixed(2)}%</td>
            <td class="text-end font-monospace">${investmentStr}</td>
            <td class="text-end font-monospace">${boughtPriceStr}</td>
            <td class="text-end font-monospace">${formatCurrency(sh.currentPrice, state.currency)}</td>
            <td class="text-end text-success font-monospace">${formatCurrency(sh.currentValue, state.currency)}</td>
            <td class="text-end ${gainClass}">${gainLossStr}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('ctTotalShares').textContent = calcTotalShares.toLocaleString();
    document.getElementById('ctTotalValue').textContent = formatCurrency(data.currentValuation, state.currency);
    
    const investmentTotalEl = document.getElementById('ctTotalInvestment');
    if (investmentTotalEl) {
        investmentTotalEl.textContent = calcTotalInvestment > 0 ? formatCurrency(calcTotalInvestment, state.currency) : '—';
    }
    
    const totalGainLossEl = document.getElementById('ctTotalGainLoss');
    if (totalGainLossEl) {
        if (calcTotalInvestment > 0) {
            let totalValueInvestors = data.shareholders.filter(s => s.type === 'Investor').reduce((sum, s) => sum + s.currentValue, 0);
            let totalGainLoss = ((totalValueInvestors - calcTotalInvestment) / calcTotalInvestment) * 100;
            let sign = totalGainLoss >= 0 ? '+' : '';
            let gainClass = totalGainLoss > 0 ? 'gain-positive' : (totalGainLoss < 0 ? 'gain-negative' : 'gain-neutral');
            totalGainLossEl.className = `text-end ${gainClass}`;
            totalGainLossEl.textContent = `${sign}${totalGainLoss.toFixed(2)}%`;
        } else {
            totalGainLossEl.textContent = '—';
            totalGainLossEl.className = 'text-end gain-neutral';
        }
    }
}

function renderCharts(data) {
    if(!data) data = calculateCapTable();
    
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    
    // Prepare Ownership Data
    const labels = data.shareholders.map(s => s.name);
    const chartData = data.shareholders.map(s => s.currentPct);
    const bgColors = data.shareholders.map(s => {
        if(s.type === 'Founder') return '#6366f1';
        if(s.type === 'ESOP') return '#f59e0b';
        if(s.type === 'Unallocated') return '#64748b';
        return '#10b981';
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

    // Share Price Growth Chart
    const ctxVal = document.getElementById('valuationChart').getContext('2d');
    if(valuationChartInstance) valuationChartInstance.destroy();
    
    const timeLabels = data.timeline.map(t => t.round);
    const sharePriceData = data.timeline.map(t => t.sharePrice);

    valuationChartInstance = new Chart(ctxVal, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Share Price',
                data: sharePriceData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#10b981',
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
                            return formatCurrency(val, state.currency);
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
                        label: (ctx) => ` Share Price: ${formatCurrency(ctx.raw, state.currency)}`
                    }
                }
            }
        }
    });
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
