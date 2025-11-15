let injuryData = null;
let refreshInterval = null;
let supabase = null;
let currentUser = null;

// Cookie helper functions
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// Initialize Supabase
async function initSupabase() {
    const response = await fetch('/api/supabase-config');
    const config = await response.json();
    
    supabase = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
            persistSession: true, // Always persist sessions
            storageKey: 'dubnation-auth',
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    
    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        console.log('Session found, user logged in:', currentUser.email);
        updateAuthUI();
        showPage('tracker'); // Go to tracker if logged in
        fetchInjuries();
    } else {
        console.log('No session found');
        updateAuthUI();
        showPage('home'); // Go to home if not logged in
    }
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            showPage('tracker');
            updateAuthUI();
            fetchInjuries();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showPage('home');
            updateAuthUI();
            sessionStorage.removeItem('sessionOnly');
        }
    });
}

function showStatus(message, type = 'info', elementId = 'status') {
    const statusEl = document.getElementById(elementId);
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.classList.remove('hidden');
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 5000);
    }
}

// Set up auto-refresh for tracker page
function startAutoRefresh() {
    if (!refreshInterval) {
        refreshInterval = setInterval(() => {
            fetchInjuries(true);
        }, 300000); // 5 minutes
    }
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Auth Tab Switching
function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabs = document.querySelectorAll('.auth-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        tabs[0].classList.add('active');
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        tabs[1].classList.add('active');
    }
}

// Handle Login
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!email || !password) {
        showStatus('Please enter email and password', 'error', 'authStatus');
        return;
    }
    
    showStatus('Signing in...', 'info', 'authStatus');
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        showStatus(`Error: ${error.message}`, 'error', 'authStatus');
    } else {
        showStatus('Login successful!', 'success', 'authStatus');
        
        // If "remember me" is NOT checked, set session to expire on browser close
        if (!rememberMe) {
            // Store a flag that this session should not persist
            sessionStorage.setItem('sessionOnly', 'true');
        } else {
            sessionStorage.removeItem('sessionOnly');
        }
    }
}

// Handle Signup
async function handleSignup() {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (!email || !password) {
        showStatus('Please enter email and password', 'error', 'authStatus');
        return;
    }
    
    if (password.length < 6) {
        showStatus('Password must be at least 6 characters', 'error', 'authStatus');
        return;
    }
    
    showStatus('Creating account...', 'info', 'authStatus');
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });
    
    if (error) {
        showStatus(`Error: ${error.message}`, 'error', 'authStatus');
    } else {
        showStatus('Account created.', 'success', 'authStatus');
    }
}

// Handle Logout
async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showStatus(`Error: ${error.message}`, 'error');
    }
}

// Page Navigation
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page-container').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected page
    if (pageName === 'home') {
        document.getElementById('homePage').classList.remove('hidden');
        document.querySelectorAll('.nav-link')[0].classList.add('active');
    } else if (pageName === 'tracker') {
        document.getElementById('trackerPage').classList.remove('hidden');
        document.querySelectorAll('.nav-link')[1].classList.add('active');
        // Auto-fetch injuries when viewing tracker
        if (!injuryData) {
            fetchInjuries();
        }
    } else if (pageName === 'about') {
        document.getElementById('aboutPage').classList.remove('hidden');
        document.querySelectorAll('.nav-link')[2].classList.add('active');
    } else if (pageName === 'auth') {
        document.getElementById('authPage').classList.remove('hidden');
    }
    
    // Update UI based on auth state
    updateAuthUI();
}

// Update UI based on authentication state
function updateAuthUI() {
    const authNavItem = document.getElementById('authNavItem');
    const logoutBtn = document.getElementById('logoutBtn');
    const emailBtn = document.getElementById('emailBtn');
    const trackerSubtitle = document.getElementById('trackerSubtitle');
    
    if (currentUser) {
        // User is logged in
        authNavItem.innerHTML = `<a href="#" class="nav-link" onclick="handleLogout()">Logout</a>`;
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (emailBtn) emailBtn.style.display = 'block';
        if (trackerSubtitle) {
            trackerSubtitle.textContent = 'Real-Time Player Health Monitoring';
        }
    } else {
        // User is not logged in
        authNavItem.innerHTML = `<a href="#" class="nav-link nav-cta" onclick="showPage('auth')">Sign In</a>`;
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (emailBtn) emailBtn.style.display = 'none';
        if (trackerSubtitle) {
            trackerSubtitle.textContent = 'Real-Time Player Health Monitoring';
        }
    }
}

// Toggle mobile menu
function toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initSupabase(); // This will handle showing the right page based on auth state
});

async function fetchInjuries(silent = false) {
    try {
        const response = await fetch('/api/injuries');
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch injuries');
        }
        
        injuryData = data.team;
        displayInjuries(injuryData);
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function displayInjuries(team) {
    const contentEl = document.getElementById('injuryContent');
    
    if (!team || !team.players || team.players.length === 0) {
        contentEl.innerHTML = `
            <div class="no-injuries">
                <div class="success-icon">✅</div>
                <h3>No Injuries Reported</h3>
                <p>All Golden State Warriors players are healthy!</p>
            </div>
        `;
        return;
    }
    
    let html = `<div class="injury-list">`;
    
    team.players.forEach(player => {
        const status = player.injuries?.[0]?.status || 'Unknown';
        const description = player.injuries?.[0]?.desc || 'No details available';
        const updateDate = player.injuries?.[0]?.update_date || 'N/A';
        
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');
        
        html += `
            <div class="injury-card">
                <div class="player-info">
                    <div class="player-name">${player.full_name}</div>
                    <div class="player-position">${player.primary_position || 'N/A'}</div>
                </div>
                <div class="injury-details">
                    <div class="injury-status status-${statusClass}">${status}</div>
                    <div class="injury-desc">${description}</div>
                    <div class="injury-date">Updated: ${new Date(updateDate).toLocaleDateString()}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    contentEl.innerHTML = html;
}

async function sendEmail() {
    if (!currentUser) {
        showStatus('Please log in first', 'error');
        return;
    }
    
    if (!injuryData) {
        showStatus('Please fetch injury data first', 'error');
        return;
    }
    
    showStatus('Sending email...', 'info');
    
    // Use logged-in user's email
    const toEmail = currentUser.email;
    const subject = 'Golden State Warriors Injury Report';
    
    // Create HTML email content
    const htmlContent = createEmailHTML(injuryData);
    
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                toEmail,
                subject,
                htmlContent
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to send email');
        }
        
        showStatus(`Email sent to ${toEmail}`, 'success');
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
        console.error('Send error:', error);
    }
}

function createEmailHTML(team) {
    let playersHTML = '';
    
    if (!team || !team.players || team.players.length === 0) {
        playersHTML = `
            <div style="text-align: center; padding: 40px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 15px; margin: 20px 0;">
                <div style="font-size: 64px; margin-bottom: 10px; animation: bounce 1s infinite;">✅</div>
                <h3 style="color: #16a34a; margin: 0 0 10px 0; font-size: 24px;">No Injuries Reported</h3>
                <p style="color: #22c55e; font-size: 16px; margin: 0;">All Golden State Warriors players are healthy and ready to dominate. 🏆</p>
            </div>
        `;
    } else {
        team.players.forEach(player => {
            const status = player.injuries?.[0]?.status || 'Unknown';
            const description = player.injuries?.[0]?.desc || 'No details available';
            const updateDate = player.injuries?.[0]?.update_date || 'N/A';
            
            let statusColor = '#1d4ed8';
            let statusEmoji = '🏥';
            if (status.toLowerCase().includes('out')) {
                statusColor = '#dc2626';
                statusEmoji = '❌';
            } else if (status.toLowerCase().includes('doubtful')) {
                statusColor = '#f59e0b';
                statusEmoji = '⚠️';
            } else if (status.toLowerCase().includes('questionable')) {
                statusColor = '#eab308';
                statusEmoji = '❓';
            }
            
            playersHTML += `
                <div style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-left: 6px solid ${statusColor}; padding: 24px; margin-bottom: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <h3 style="margin: 0 0 8px 0; color: #1d4ed8; font-size: 22px; font-weight: 700;">${player.full_name}</h3>
                            <p style="margin: 0; color: #64748b; font-size: 15px; font-weight: 500;">#${player.jersey_number || 'N/A'} • ${player.primary_position || 'N/A'}</p>
                        </div>
                        <span style="background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 25px; font-size: 13px; font-weight: 700; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">${statusEmoji} ${status}</span>
                    </div>
                    <div style="background: #f1f5f9; padding: 14px; border-radius: 8px; margin: 12px 0;">
                        <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6;"><strong style="color: #1d4ed8;">Injury Details:</strong> ${description}</p>
                    </div>
                    <p style="margin: 0; color: #94a3b8; font-size: 13px;">📅 Last Updated: ${new Date(updateDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
            `;
        });
    }
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .promo-button {
                    display: inline-block;
                    background: linear-gradient(90deg, #1d4ed8 0%, #2563eb 25%, #fbbf24 50%, #2563eb 75%, #1d4ed8 100%);
                    background-size: 200% auto;
                    color: white;
                    text-decoration: none;
                    padding: 18px 40px;
                    border-radius: 50px;
                    font-size: 18px;
                    font-weight: 700;
                    animation: shimmer 3s linear infinite, pulse 2s ease-in-out infinite;
                    box-shadow: 0 6px 20px rgba(29, 78, 216, 0.4);
                    transition: transform 0.2s;
                }
                .promo-button:hover {
                    transform: scale(1.1);
                }
            </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);">
            <div style="max-width: 650px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border-radius: 20px; overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #fbbf24 100%); color: white; padding: 50px 30px; text-align: center; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,%3Csvg width=\"40\" height=\"40\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h20v20H0V0zm20 20h20v20H20V20z\" fill=\"%23ffffff\" fill-opacity=\"0.05\"/%3E%3C/svg%3E'); opacity: 0.3;"></div>
                    <div style="position: relative; z-index: 1;">
                        <div style="font-size: 72px; margin-bottom: 15px; animation: bounce 2s infinite;">🏀</div>
                        <h1 style="margin: 0 0 15px 0; font-size: 38px; font-weight: 900; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">DUBNATION HEALTH HUB</h1>
                        <div style="display: inline-block; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 12px 24px; border-radius: 30px; margin-bottom: 10px;">
                            <p style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 1px;">🔵⚪ WARRIORS INJURY REPORT ⚪🔵</p>
                        </div>
                        <p style="margin: 10px 0 0 0; font-size: 15px; opacity: 0.95; font-weight: 500;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #1d4ed8; margin: 0 0 10px 0; font-size: 28px; font-weight: 800;">📋 Current Team Status</h2>
                        <div style="width: 80px; height: 4px; background: linear-gradient(90deg, #1d4ed8, #fbbf24); margin: 0 auto; border-radius: 2px;"></div>
                    </div>
                    ${playersHTML}
                </div>
                
                <!-- Promo Section -->
                <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 50px 30px; text-align: center; margin-top: 30px;">
                    <div style="margin-bottom: 25px;">
                        <h2 style="color: #fbbf24; margin: 0 0 15px 0; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">⚡ EXCLUSIVE OFFER ⚡</h2>
                        <p style="color: #e2e8f0; margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">Rep Your Warriors in Style!</p>
                        <p style="color: #cbd5e1; margin: 0; font-size: 15px;">Official Golden State Warriors Gear & Merchandise</p>
                    </div>
                    <div style="margin: 30px 0;">
                        <a href="https://www.rakuten.com/shop/warriorsshop" class="promo-button" style="display: inline-block; background: linear-gradient(90deg, #1d4ed8 0%, #2563eb 25%, #fbbf24 50%, #2563eb 75%, #1d4ed8 100%); background-size: 200% auto; color: white; text-decoration: none; padding: 18px 40px; border-radius: 50px; font-size: 18px; font-weight: 700; box-shadow: 0 6px 20px rgba(251, 191, 36, 0.4);">
                            🛒 SHOP WARRIORS STORE NOW 🏆
                        </a>
                    </div>
                    <p style="color: #94a3b8; margin: 20px 0 0 0; font-size: 13px;">Limited time offers • Free shipping on orders over $50</p>
                </div>
                
                <!-- Footer -->
                <div style="background: #f8fafc; padding: 30px 20px; text-align: center; border-top: 3px solid #1d4ed8;">
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; font-weight: 600;">Powered by DubNation Health Hub 💙💛</p>
                    <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px;">Real-time injury data provided by Sportradar</p>
                    <p style="margin: 0; color: #cbd5e1; font-size: 11px;">© ${new Date().getFullYear()} DubNation Health Hub. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

let selectedAvatar = null;
let uploadedAvatar = null;

// Toggle profile dropdown menu
function toggleProfileMenu() {
    const profileMenu = document.getElementById('profileMenu');
    profileMenu.classList.toggle('active');
}

// Close profile menu when clicking outside
document.addEventListener('click', (e) => {
    const profileDropdown = document.getElementById('profileDropdown');
    const profileMenu = document.getElementById('profileMenu');
    const profileAvatar = profileDropdown?.querySelector('.profile-avatar');
    
    if (profileDropdown && !profileDropdown.contains(e.target) && profileMenu) {
        profileMenu.classList.remove('active');
    }
});

// Select avatar from grid
function selectAvatar(avatarId) {
    // Remove previous selection
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selection to clicked avatar
    event.target.closest('.avatar-option').classList.add('selected');
    
    // Store selected avatar
    selectedAvatar = avatarId;
    uploadedAvatar = null; // Clear uploaded avatar if selecting from grid
    
    // Update current avatar preview
    const avatarImg = event.target.closest('.avatar-option').querySelector('img').src;
    document.getElementById('currentAvatar').src = avatarImg;
}

// Handle avatar upload
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showStatus('File size must be less than 2MB', 'error', 'profileStatus');
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showStatus('Please upload an image file', 'error', 'profileStatus');
        return;
    }
    
    // Read and display the image
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedAvatar = e.target.result;
        selectedAvatar = null; // Clear grid selection
        
        // Update current avatar preview
        document.getElementById('currentAvatar').src = uploadedAvatar;
        
        // Remove selection from grid
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        showStatus('Avatar uploaded. Click Save Profile to apply changes.', 'success', 'profileStatus');
    };
    reader.readAsDataURL(file);
}

// Save profile
async function saveProfile() {
    if (!currentUser) {
        showStatus('Please log in first', 'error', 'profileStatus');
        return;
    }
    
    const displayName = document.getElementById('displayName').value;
    const avatar = uploadedAvatar || getAvatarUrl(selectedAvatar);
    
    // Save to localStorage (in production, save to Supabase database)
    const profileData = {
        email: currentUser.email,
        displayName: displayName || currentUser.email.split('@')[0],
        avatar: avatar || 'https://api.dicebear.com/7.x/notionists/svg?seed=basketball'
    };
    
    localStorage.setItem(`profile_${currentUser.id}`, JSON.stringify(profileData));
    
    // Update UI
    updateProfileUI(profileData);
    
    showStatus('Profile saved successfully!', 'success', 'profileStatus');
    
    // Redirect to tracker after 1 second
    setTimeout(() => {
        showPage('tracker');
    }, 1000);
}

// Get avatar URL from ID
function getAvatarUrl(avatarId) {
    if (!avatarId) return null;
    
    const avatarMap = {
        'basketball-1': 'https://api.dicebear.com/7.x/notionists/svg?seed=basketball',
        'basketball-2': 'https://api.dicebear.com/7.x/notionists/svg?seed=trophy',
        'basketball-3': 'https://api.dicebear.com/7.x/notionists/svg?seed=warrior',
        'basketball-4': 'https://api.dicebear.com/7.x/notionists/svg?seed=champion',
        'basketball-5': 'https://api.dicebear.com/7.x/notionists/svg?seed=mvp',
        'basketball-6': 'https://api.dicebear.com/7.x/notionists/svg?seed=dubs',
        'basketball-7': 'https://api.dicebear.com/7.x/notionists/svg?seed=splash',
        'basketball-8': 'https://api.dicebear.com/7.x/notionists/svg?seed=dynasty',
        'basketball-9': 'https://api.dicebear.com/7.x/notionists/svg?seed=curry30',
        'basketball-10': 'https://api.dicebear.com/7.x/notionists/svg?seed=gsw',
        'basketball-11': 'https://api.dicebear.com/7.x/notionists/svg?seed=dubnation',
        'basketball-12': 'https://api.dicebear.com/7.x/notionists/svg?seed=warriors'
    };
    
    return avatarMap[avatarId];
}

// Update profile UI across the app
function updateProfileUI(profileData) {
    // Update nav avatar
    const navAvatar = document.getElementById('navProfileAvatar');
    const menuAvatar = document.getElementById('menuProfileAvatar');
    const profileMenuEmail = document.getElementById('profileMenuEmail');
    
    if (navAvatar) navAvatar.src = profileData.avatar;
    if (menuAvatar) menuAvatar.src = profileData.avatar;
    if (profileMenuEmail) profileMenuEmail.textContent = profileData.displayName;
}

// Load profile data
function loadProfile() {
    if (!currentUser) return;
    
    // Always set email from Supabase (read-only)
    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail) {
        profileEmail.value = currentUser.email;
    }
    
    const savedProfile = localStorage.getItem(`profile_${currentUser.id}`);
    
    if (savedProfile) {
        const profileData = JSON.parse(savedProfile);
        updateProfileUI(profileData);
        
        // Update profile page fields
        const displayName = document.getElementById('displayName');
        const currentAvatar = document.getElementById('currentAvatar');
        
        if (displayName) displayName.value = profileData.displayName;
        if (currentAvatar) currentAvatar.src = profileData.avatar;
    } else {
        // Set default profile
        const defaultProfile = {
            email: currentUser.email,
            displayName: currentUser.email.split('@')[0],
            avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=basketball'
        };
        updateProfileUI(defaultProfile);
        
        // Update profile page with defaults
        const displayName = document.getElementById('displayName');
        const currentAvatar = document.getElementById('currentAvatar');
        
        if (displayName) displayName.value = defaultProfile.displayName;
        if (currentAvatar) currentAvatar.src = defaultProfile.avatar;
    }
}

// Update the existing updateAuthUI function to show/hide profile dropdown
const originalUpdateAuthUI = updateAuthUI;
updateAuthUI = function() {
    originalUpdateAuthUI();
    
    const profileDropdown = document.getElementById('profileDropdown');
    const authNavItem = document.getElementById('authNavItem');
    
    if (currentUser) {
        // Show profile dropdown, hide auth nav item
        if (profileDropdown) profileDropdown.style.display = 'block';
        if (authNavItem) authNavItem.style.display = 'none';
        
        // Load profile data
        loadProfile();
    } else {
        // Hide profile dropdown, show auth nav item
        if (profileDropdown) profileDropdown.style.display = 'none';
        if (authNavItem) authNavItem.style.display = 'block';
    }
};

// Update showPage to handle profile page
const originalShowPage = showPage;
showPage = function(pageName) {
    originalShowPage(pageName);
    
    if (pageName === 'profile') {
        if (!currentUser) {
            showPage('auth');
            return;
        }
        document.getElementById('profilePage').classList.remove('hidden');
        loadProfile();
    }
};
