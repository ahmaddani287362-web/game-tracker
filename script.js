// ============================================
// GAME TRACKER PREMIUM - MODIFIED renderLibrary
// With Portrait Cards, Glassmorphism, Status Badges
// ============================================

let supabaseClient = null;
let gamesData = [];
let currentCoverUrl = null;
let deleteId = null;
let genreChart, completionChart, ratingChart;

// ============================================
// RENDER LIBRARY - PREMIUM VERSION
// ============================================

function renderStars(rating) {
    let stars = '';
    const full = Math.floor(rating);
    const half = rating % 1 !== 0;
    for (let i = 1; i <= 5; i++) {
        if (i <= full) stars += '<i class="fas fa-star text-amber-400"></i>';
        else if (half && i === full + 1) stars += '<i class="fas fa-star-half-alt text-amber-400"></i>';
        else stars += '<i class="far fa-star text-gray-300 dark:text-gray-600"></i>';
    }
    return stars;
}

function getStatusBadge(status) {
    const badges = {
        playing: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: 'fa-play-circle', label: 'Playing' },
        backlog: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: 'fa-book', label: 'Backlog' },
        completed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', icon: 'fa-trophy', label: 'Completed' }
    };
    const badge = badges[status] || badges.backlog;
    return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}"><i class="fas ${badge.icon} text-xs"></i> ${badge.label}</span>`;
}

function getSmartPlaceholder(title) {
    if (!title) title = 'Game';
    const colors = ['8b5cf6', 'ec4899', '06b6d4', 'f97316', '10b981', 'f59e0b'];
    const color = colors[title.length % colors.length];
    return `https://placehold.co/400x600/${color}/ffffff?text=${encodeURIComponent(title.substring(0,2).toUpperCase())}`;
}

function showSkeletons() {
    const grid = document.getElementById('gamesGrid');
    if (!grid) return;
    grid.innerHTML = Array(6).fill(0).map(() => `
        <div class="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 animate-pulse">
            <div class="aspect-[2/3] bg-gray-200 dark:bg-gray-700 shimmer"></div>
            <div class="p-3 space-y-2">
                <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg shimmer w-3/4"></div>
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg shimmer w-1/2"></div>
                <div class="flex gap-1 mt-2">
                    <div class="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full shimmer"></div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderGameCard(game) {
    const coverUrl = game.cover_url || getSmartPlaceholder(game.title);
    const progress = game.progress || 0;
    const rating = game.rating || 0;
    const hours = game.hours_played || 0;
    
    return `
        <div class="game-card group relative rounded-2xl overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 cursor-pointer" data-id="${game.id}" data-game='${JSON.stringify(game)}'>
            <!-- Cover Image - Portrait 2:3 Aspect Ratio -->
            <div class="relative aspect-[2/3] overflow-hidden">
                <img src="${coverUrl}" alt="${escapeHtml(game.title)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onerror="this.src='${getSmartPlaceholder(game.title)}'">
                
                <!-- Gradient Overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <!-- Progress Bar -->
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50">
                    <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                </div>
                
                <!-- Status Badge - Top Right -->
                <div class="absolute top-2 right-2">
                    ${getStatusBadge(game.status)}
                </div>
                
                <!-- Quick Actions - On Hover -->
                <div class="absolute bottom-2 left-2 right-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button class="edit-game tap-target w-9 h-9 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center hover:bg-purple-600 transition-colors" data-id="${game.id}">
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                    <button class="delete-game tap-target w-9 h-9 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center hover:bg-red-500 transition-colors" data-id="${game.id}">
                        <i class="fas fa-trash-alt text-sm"></i>
                    </button>
                </div>
            </div>
            
            <!-- Card Content -->
            <div class="p-3 space-y-1.5">
                <h3 class="font-bold text-sm md:text-base line-clamp-1 text-gray-800 dark:text-white">${escapeHtml(game.title)}</h3>
                
                <!-- Platform & Hours -->
                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span class="flex items-center gap-1"><i class="fas fa-desktop"></i> ${escapeHtml(game.platform) || 'Unknown'}</span>
                    <span class="flex items-center gap-1"><i class="fas fa-clock"></i> ${hours}h</span>
                </div>
                
                <!-- Rating Stars -->
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-0.5">${renderStars(rating)}</div>
                    <span class="text-xs font-semibold ${rating >= 4 ? 'text-amber-500' : 'text-gray-400'}">${rating.toFixed(1)}</span>
                </div>
                
                <!-- Genre Tag -->
                <div class="flex flex-wrap gap-1 pt-1">
                    <span class="inline-block px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">
                        ${escapeHtml(game.genre) || 'General'}
                    </span>
                </div>
            </div>
        </div>
    `;
}

function renderGroupedGames(filtered) {
    const groups = {
        playing: { title: '🎮 Currently Playing', icon: 'fa-play-circle', color: 'blue', games: [] },
        backlog: { title: '📚 Backlog', icon: 'fa-book', color: 'amber', games: [] },
        completed: { title: '🏆 Completed', icon: 'fa-trophy', color: 'emerald', games: [] }
    };
    
    filtered.forEach(game => {
        if (groups[game.status]) groups[game.status].games.push(game);
    });
    
    let html = '';
    const order = ['playing', 'backlog', 'completed'];
    
    for (const status of order) {
        const group = groups[status];
        if (group.games.length === 0) continue;
        
        html += `
            <div class="mb-8">
                <div class="flex items-center gap-2 mb-4">
                    <div class="w-8 h-8 rounded-xl bg-${group.color}-100 dark:bg-${group.color}-900/30 flex items-center justify-center">
                        <i class="fas ${group.icon} text-${group.color}-600 dark:text-${group.color}-400"></i>
                    </div>
                    <h2 class="text-lg font-semibold text-gray-800 dark:text-white">${group.title}</h2>
                    <span class="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">${group.games.length}</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    ${group.games.map(game => renderGameCard(game)).join('')}
                </div>
            </div>
        `;
    }
    
    return html;
}

async function renderLibrary() {
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const genreFilter = document.getElementById('filterGenre')?.value || '';
    const platformFilter = document.getElementById('filterPlatform')?.value || '';
    const ratingFilter = document.getElementById('filterRating')?.value || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    
    let filtered = gamesData.filter(g => g.title?.toLowerCase().includes(search));
    if (genreFilter) filtered = filtered.filter(g => g.genre === genreFilter);
    if (platformFilter) filtered = filtered.filter(g => g.platform === platformFilter);
    if (ratingFilter) filtered = filtered.filter(g => g.rating >= parseInt(ratingFilter));
    
    const grid = document.getElementById('gamesGrid');
    if (!grid) return;
    
    if (!filtered.length) {
        // Premium Empty State
        grid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div class="w-32 h-32 mb-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
                    <i class="fas fa-gamepad text-5xl text-purple-400 dark:text-purple-500 opacity-50"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Games Found</h3>
                <p class="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your filters or add a new game</p>
                <button id="emptyAddBtn" class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                    <i class="fas fa-plus mr-2"></i> Add Your First Game
                </button>
            </div>
        `;
        const emptyBtn = document.getElementById('emptyAddBtn');
        if (emptyBtn) emptyBtn.addEventListener('click', () => document.getElementById('addGameBtn')?.click());
        return;
    }
    
    // Show skeletons first
    showSkeletons();
    
    // Small delay for smooth transition
    setTimeout(() => {
        let html;
        if (statusFilter) {
            html = `<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">${filtered.map(game => renderGameCard(game)).join('')}</div>`;
        } else {
            html = renderGroupedGames(filtered);
        }
        grid.innerHTML = html;
        
        // Attach event listeners
        attachGameCardEvents();
    }, 150);
}

function attachGameCardEvents() {
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.edit-game') && !e.target.closest('.delete-game')) {
                const gameData = JSON.parse(card.dataset.game);
                openGameDetail(gameData.id, gameData.title);
            }
        });
    });
    
    document.querySelectorAll('.edit-game').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            vibrate();
            openEditModal(btn.dataset.id);
        });
    });
    
    document.querySelectorAll('.delete-game').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            vibrate();
            deleteId = btn.dataset.id;
            document.getElementById('deleteModal').style.display = 'flex';
        });
    });
}

// Helper functions
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function vibrate() {
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(30);
    }
}

function showNotification(message, type) {
    // Create floating toast notification
    const toast = document.createElement('div');
    toast.className = `fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:bottom-8 md:min-w-80 z-50 p-4 rounded-xl text-white font-medium ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'} shadow-xl animate-fade-in`;
    toast.innerHTML = `<div class="flex items-center gap-2"><i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}</div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Charts with Gradient Colors
function updateCharts() {
    const isDark = document.body.classList.contains('dark');
    const textColor = isDark ? '#cbd5e1' : '#475569';
    
    // Genre Chart - Gradient Doughnut
    const genreCtx = document.getElementById('genreChart')?.getContext('2d');
    if (genreCtx) {
        const genreCount = {};
        gamesData.forEach(g => { if (g.genre) genreCount[g.genre] = (genreCount[g.genre] || 0) + 1; });
        const topGenres = Object.entries(genreCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
        
        if (genreChart) genreChart.destroy();
        genreChart = new Chart(genreCtx, {
            type: 'doughnut',
            data: {
                labels: topGenres.map(g => g[0]),
                datasets: [{
                    data: topGenres.map(g => g[1]),
                    backgroundColor: ['#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#10b981'],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '60%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: textColor, font: { size: 12 } } }
                }
            }
        });
    }
    
    // Completion Chart - Gradient Bar
    const completionCtx = document.getElementById('completionChart')?.getContext('2d');
    if (completionCtx) {
        const completionData = [
            gamesData.filter(g => g.status === 'completed').length,
            gamesData.filter(g => g.status === 'playing').length,
            gamesData.filter(g => g.status === 'backlog').length
        ];
        const gradient = completionCtx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#a855f7');
        
        if (completionChart) completionChart.destroy();
        completionChart = new Chart(completionCtx, {
            type: 'bar',
            data: {
                labels: ['Completed', 'Playing', 'Backlog'],
                datasets: [{
                    label: 'Games',
                    data: completionData,
                    backgroundColor: gradient,
                    borderRadius: 12,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { display: false }, beginAtZero: true, ticks: { color: textColor } },
                    x: { ticks: { color: textColor } }
                }
            }
        });
    }
    
    // Rating Chart - Gradient Line
    const ratingCtx = document.getElementById('ratingChart')?.getContext('2d');
    if (ratingCtx) {
        const ratingDist = [0,0,0,0,0];
        gamesData.forEach(g => {
            if (g.rating >= 1 && g.rating <= 5) ratingDist[Math.floor(g.rating) - 1]++;
        });
        const gradient = ratingCtx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, '#f59e0b');
        gradient.addColorStop(1, '#fbbf24');
        
        if (ratingChart) ratingChart.destroy();
        ratingChart = new Chart(ratingCtx, {
            type: 'line',
            data: {
                labels: ['★1', '★2', '★3', '★4', '★5'],
                datasets: [{
                    label: 'Games',
                    data: ratingDist,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: 'white'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { display: false }, beginAtZero: true, ticks: { color: textColor } },
                    x: { ticks: { color: textColor } }
                }
            }
        });
    }
}

// Update dashboard stats
function updateDashboard() {
    const total = gamesData.length;
    const completed = gamesData.filter(g => g.status === 'completed').length;
    const totalHours = gamesData.reduce((s, g) => s + (g.hours_played || 0), 0);
    const avgRating = total > 0 ? (gamesData.reduce((s, g) => s + (g.rating || 0), 0) / total).toFixed(1) : 0;
    
    document.getElementById('totalGames').innerText = total;
    document.getElementById('completedGames').innerText = completed;
    document.getElementById('totalHours').innerText = totalHours;
    document.getElementById('avgRating').innerText = avgRating;
    updateCharts();
}

// Fetch games from Supabase
async function fetchGames() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('games').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        gamesData = data || [];
        renderLibrary();
        updateDashboard();
        updateFilters();
    } catch(e) {
        console.error(e);
        showNotification('Failed to load games', 'error');
    }
}

// Update filter dropdowns
function updateFilters() {
    const genres = [...new Set(gamesData.map(g => g.genre).filter(Boolean))];
    const platforms = [...new Set(gamesData.map(g => g.platform).filter(Boolean))];
    
    const genreSelect = document.getElementById('filterGenre');
    const platformSelect = document.getElementById('filterPlatform');
    
    if (genreSelect) {
        genreSelect.innerHTML = '<option value="">All Genres</option>' + genres.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
    }
    if (platformSelect) {
        platformSelect.innerHTML = '<option value="">All Platforms</option>' + platforms.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_KEY = window.SUPABASE_KEY;
    
    if (SUPABASE_URL && SUPABASE_KEY) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    
    // Setup search, dark mode, etc...
    setupGameSearch();
    setupDarkMode();
    setupTabSwitching();
    setupModalHandlers();
    
    fetchGames();
    
    // Realtime subscription
    if (supabaseClient) {
        supabaseClient.channel('games').on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => fetchGames()).subscribe();
    }
});

// Additional setup functions (search, dark mode, tabs, modals)
function setupGameSearch() { /* Implement search logic */ }
function setupDarkMode() { /* Implement dark mode toggle */ }
function setupTabSwitching() { /* Implement tab switching */ }
function setupModalHandlers() { /* Implement modal handlers */ }
function openGameDetail(id, title) { /* Implement detail modal */ }
function openEditModal(id) { /* Implement edit modal */ }