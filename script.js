// ============================================
// GAME TRACKER PREMIUM - MODULE PATTERN
// Professional Architecture with All Features
// ============================================

// ============================================
// 1. CONFIGURATION MODULE
// ============================================
const Config = {
    SUPABASE_URL: window.SUPABASE_URL,
    SUPABASE_KEY: window.SUPABASE_KEY,
    RAWG_API_KEY: window.RAWG_API_KEY,
    CACHE_DURATION: 3600000, // 1 hour
    SEARCH_DEBOUNCE: 500,
    
    init() {
        if (!this.SUPABASE_URL || !this.SUPABASE_KEY) {
            console.error('❌ Supabase credentials missing');
            this.showError('Configuration Error', 'Supabase credentials not found');
        }
    },
    
    showError(title, message) {
        Swal.fire({ icon: 'error', title, text: message, background: '#1e293b', color: '#fff' });
    },
    
    showSuccess(message) {
        Swal.fire({ icon: 'success', title: 'Success!', text: message, timer: 2000, showConfirmButton: false, background: '#1e293b', color: '#fff' });
    }
};

// ============================================
// 2. CACHE MANAGER (localStorage)
// ============================================
const CacheManager = {
    set(key, data) {
        const item = { data, timestamp: Date.now() };
        localStorage.setItem(`game_cache_${key}`, JSON.stringify(item));
    },
    
    get(key) {
        const item = localStorage.getItem(`game_cache_${key}`);
        if (!item) return null;
        
        const parsed = JSON.parse(item);
        if (Date.now() - parsed.timestamp > Config.CACHE_DURATION) {
            localStorage.removeItem(`game_cache_${key}`);
            return null;
        }
        return parsed.data;
    },
    
    clear() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('game_cache_')) localStorage.removeItem(key);
        });
    }
};

// ============================================
// 3. API MODULE (RAWG)
// ============================================
const GameAPI = {
    async searchGames(query) {
        if (!query || query.length < 2) return [];
        
        // Check cache
        const cached = CacheManager.get(`search_${query}`);
        if (cached) return cached;
        
        try {
            const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&key=${Config.RAWG_API_KEY}&page_size=10`;
            const response = await fetch(url);
            const data = await response.json();
            
            const results = data.results?.map(game => ({
                id: game.id,
                name: game.name,
                cover: game.background_image,
                genres: game.genres?.map(g => g.name).join(', ') || '',
                platforms: game.platforms?.map(p => p.platform.name).slice(0, 3).join(', ') || '',
                rating: game.rating || 0,
                released: game.released || '',
                description: game.description_raw || 'No description available.',
                metacritic: game.metacritic,
                website: game.website,
                reddit_url: game.reddit_url
            })) || [];
            
            CacheManager.set(`search_${query}`, results);
            return results;
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    },
    
    async getGameDetails(id) {
        const cached = CacheManager.get(`detail_${id}`);
        if (cached) return cached;
        
        try {
            const url = `https://api.rawg.io/api/games/${id}?key=${Config.RAWG_API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            
            CacheManager.set(`detail_${id}`, data);
            return data;
        } catch (error) {
            console.error('Detail fetch error:', error);
            return null;
        }
    },
    
    async fetchCover(title) {
        const cached = CacheManager.get(`cover_${title}`);
        if (cached) return cached;
        
        try {
            const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(title)}&key=${Config.RAWG_API_KEY}&page_size=1`;
            const response = await fetch(url);
            const data = await response.json();
            const cover = data.results?.[0]?.background_image || null;
            CacheManager.set(`cover_${title}`, cover);
            return cover;
        } catch {
            return null;
        }
    }
};

// ============================================
// 4. UI CONTROLLER
// ============================================
const UIController = {
    gamesData: [],
    charts: { genre: null, completion: null, rating: null },
    currentCoverUrl: null,
    selectedSearchIndex: -1,
    
    // Render Library with Premium Cards
    async renderLibrary() {
        const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const genreFilter = document.getElementById('filterGenre')?.value || '';
        const platformFilter = document.getElementById('filterPlatform')?.value || '';
        const ratingFilter = document.getElementById('filterRating')?.value || '';
        const statusFilter = document.getElementById('filterStatus')?.value || '';
        
        let filtered = this.gamesData.filter(g => g.title?.toLowerCase().includes(search));
        if (genreFilter) filtered = filtered.filter(g => g.genre === genreFilter);
        if (platformFilter) filtered = filtered.filter(g => g.platform === platformFilter);
        if (ratingFilter) filtered = filtered.filter(g => g.rating >= parseInt(ratingFilter));
        if (statusFilter) filtered = filtered.filter(g => g.status === statusFilter);
        
        const grid = document.getElementById('gamesGrid');
        if (!grid) return;
        
        if (!filtered.length) {
            grid.innerHTML = `<div class="empty-state"><i class="fas fa-gamepad" style="font-size:3rem; margin-bottom:1rem"></i><p>✨ No games found. Add your first game!</p></div>`;
            return;
        }
        
        // Show skeletons
        grid.innerHTML = Array(8).fill(0).map(() => `
            <div class="game-card">
                <div class="skeleton skeleton-cover"></div>
                <div class="card-content">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text" style="width:60%"></div>
                </div>
            </div>
        `).join('');
        
        // Render actual cards
        const cardsHtml = filtered.map(game => `
            <div class="game-card" data-id="${game.id}" data-game='${JSON.stringify(game)}'>
                <div class="game-cover">
                    <img src="${game.cover_url || 'https://placehold.co/300x450/1e1b2e/8b5cf6?text=' + encodeURIComponent(game.title.substring(0,1))}" 
                         alt="${this.escapeHtml(game.title)}" loading="lazy"
                         onerror="this.src='https://placehold.co/300x450/1e1b2e/8b5cf6?text=${encodeURIComponent(game.title.substring(0,2))}'">
                    <div class="cover-overlay"></div>
                    <div class="progress-overlay">
                        <div class="progress-fill" style="width:${game.progress || 0}%"></div>
                    </div>
                </div>
                <div class="card-content">
                    <div class="game-title">
                        ${this.escapeHtml(game.title)}
                        <small>${this.escapeHtml(game.platform) || '-'}</small>
                    </div>
                    <div class="rating-stars">
                        ${this.renderStars(game.rating || 0)} 
                        <span style="font-size:0.7rem">⏱️ ${game.hours_played || 0}h</span>
                    </div>
                    <div class="game-meta">
                        <span class="tag"><i class="fas fa-tag"></i> ${this.escapeHtml(game.genre) || 'General'}</span>
                        ${game.tags ? game.tags.split(',').slice(0,2).map(t => `<span class="tag">#${this.escapeHtml(t.trim())}</span>`).join('') : ''}
                    </div>
                    <div class="card-actions">
                        <button class="edit-game" data-id="${game.id}"><i class="fas fa-edit"></i> Edit</button>
                        <button class="delete-game" data-id="${game.id}"><i class="fas fa-trash-alt"></i> Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
        
        grid.innerHTML = cardsHtml;
        
        // Attach event listeners
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.card-actions')) {
                    const gameData = JSON.parse(card.dataset.game);
                    this.openGameDetail(gameData.id, gameData.title);
                }
            });
        });
        
        document.querySelectorAll('.edit-game').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditModal(btn.dataset.id);
            });
        });
        
        document.querySelectorAll('.delete-game').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showDeleteConfirm(btn.dataset.id);
            });
        });
    },
    
    renderStars(rating) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const isHighRating = rating >= 4;
        
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars += `<i class="fas fa-star" ${isHighRating ? 'style="filter: drop-shadow(0 0 4px #fbbf24)"' : ''}></i>`;
            } else if (hasHalfStar && i === fullStars + 1) {
                stars += `<i class="fas fa-star-half-alt" ${isHighRating ? 'style="filter: drop-shadow(0 0 4px #fbbf24)"' : ''}></i>`;
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        return stars;
    },
    
    // Premium Charts with Gradients
    updateCharts(data) {
        // Genre distribution
        const genreCount = {};
        data.forEach(g => { if (g.genre) genreCount[g.genre] = (genreCount[g.genre] || 0) + 1; });
        const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
        
        const genreCtx = document.getElementById('genreChart')?.getContext('2d');
        if (genreCtx) {
            if (this.charts.genre) this.charts.genre.destroy();
            this.charts.genre = new Chart(genreCtx, {
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
                    cutout: '65%',
                    plugins: { legend: { position: 'bottom', labels: { color: getComputedStyle(document.body).getPropertyValue('--text-secondary') } } }
                }
            });
        }
        
        // Completion chart with gradient bar
        const completionCtx = document.getElementById('completionChart')?.getContext('2d');
        if (completionCtx) {
            const completionData = [
                data.filter(g => g.status === 'completed').length,
                data.filter(g => g.status === 'playing').length,
                data.filter(g => g.status === 'backlog').length
            ];
            if (this.charts.completion) this.charts.completion.destroy();
            this.charts.completion = new Chart(completionCtx, {
                type: 'bar',
                data: {
                    labels: ['🏆 Completed', '🎮 Playing', '📚 Backlog'],
                    datasets: [{
                        label: 'Games',
                        data: completionData,
                        backgroundColor: (ctx) => {
                            const gradient = completionCtx.createLinearGradient(0, 0, 0, 400);
                            gradient.addColorStop(0, '#8b5cf6');
                            gradient.addColorStop(1, '#a855f7');
                            return gradient;
                        },
                        borderRadius: 12,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { grid: { display: false }, beginAtZero: true }, x: { grid: { display: false } } }
                }
            });
        }
        
        // Rating distribution with line gradient
        const ratingCtx = document.getElementById('ratingChart')?.getContext('2d');
        if (ratingCtx) {
            const ratingDist = [0, 0, 0, 0, 0];
            data.forEach(g => {
                if (g.rating >= 1 && g.rating <= 5) ratingDist[Math.floor(g.rating) - 1]++;
            });
            if (this.charts.rating) this.charts.rating.destroy();
            
            const gradient = ratingCtx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, '#f59e0b');
            gradient.addColorStop(1, '#fbbf24');
            
            this.charts.rating = new Chart(ratingCtx, {
                type: 'line',
                data: {
                    labels: ['★1', '★2', '★3', '★4', '★5'],
                    datasets: [{
                        label: 'Games',
                        data: ratingDist,
                        borderColor: '#f59e0b',
                        backgroundColor: gradient,
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true,
                        pointBackgroundColor: '#f59e0b',
                        pointBorderColor: 'white',
                        pointRadius: 5,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { grid: { display: false }, beginAtZero: true }, x: { grid: { display: false } } }
                }
            });
        }
    },
    
    // Premium Search with Keyboard Navigation
    setupGameSearch() {
        const searchInput = document.getElementById('gameSearchInput');
        const resultsDiv = document.getElementById('searchResults');
        let searchTimeout = null;
        
        if (!searchInput) return;
        
        const updateResults = async () => {
            const query = searchInput.value.trim();
            if (query.length < 2) {
                resultsDiv.style.display = 'none';
                return;
            }
            
            resultsDiv.innerHTML = '<div style="padding:1rem; text-align:center"><div class="loading-spinner"></div> Searching...</div>';
            resultsDiv.style.display = 'block';
            
            const results = await GameAPI.searchGames(query);
            this.searchResults = results;
            this.selectedSearchIndex = -1;
            
            if (!results.length) {
                resultsDiv.innerHTML = '<div style="padding:1rem; text-align:center">No games found</div>';
                return;
            }
            
            resultsDiv.innerHTML = results.map((game, idx) => `
                <div class="search-result-item" data-index="${idx}">
                    <img src="${game.cover || 'https://placehold.co/50x50/8b5cf6/white?text=?'}" alt="${this.escapeHtml(game.name)}">
                    <div class="search-result-info">
                        <h4>${this.escapeHtml(game.name)}</h4>
                        <p>${game.genres || 'No genre'} | ${game.platforms || 'Unknown'}</p>
                        <p>⭐ ${game.rating}/5</p>
                    </div>
                </div>
            `).join('');
            
            document.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const idx = parseInt(item.dataset.index);
                    this.autoFillGameForm(results[idx]);
                    resultsDiv.style.display = 'none';
                    searchInput.value = '';
                });
            });
        };
        
        searchInput.addEventListener('input', () => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(updateResults, Config.SEARCH_DEBOUNCE);
        });
        
        // Keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            const items = document.querySelectorAll('.search-result-item');
            if (!items.length) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedSearchIndex = Math.min(this.selectedSearchIndex + 1, items.length - 1);
                this.updateSelectedItem(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedSearchIndex = Math.max(this.selectedSearchIndex - 1, -1);
                this.updateSelectedItem(items);
            } else if (e.key === 'Enter' && this.selectedSearchIndex >= 0) {
                e.preventDefault();
                items[this.selectedSearchIndex]?.click();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
                resultsDiv.style.display = 'none';
            }
        });
    },
    
    updateSelectedItem(items) {
        items.forEach((item, idx) => {
            if (idx === this.selectedSearchIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    },
    
    autoFillGameForm(gameData) {
        document.getElementById('title').value = gameData.name;
        if (gameData.platforms) document.getElementById('platform').value = gameData.platforms.split(',')[0].trim();
        if (gameData.genres) {
            document.getElementById('genre').value = gameData.genres;
            const tags = gameData.genres.split(',').map(g => g.trim().toLowerCase());
            if (gameData.released) tags.push(gameData.released.split('-')[0]);
            document.getElementById('tags').value = tags.join(', ');
        }
        if (gameData.rating) {
            const roundedRating = Math.round(gameData.rating * 2) / 2;
            document.getElementById('rating').value = Math.min(5, Math.max(1, roundedRating));
        }
        if (gameData.cover) {
            this.currentCoverUrl = gameData.cover;
            const coverPreview = document.getElementById('coverPreview');
            const coverContainer = document.getElementById('coverPreviewContainer');
            coverPreview.src = gameData.cover;
            coverContainer.style.display = 'block';
        }
        Config.showSuccess(`🎮 "${gameData.name}" auto-filled!`);
    },
    
    async openGameDetail(gameId, title) {
        const modal = document.getElementById('detailModal');
        const heroDiv = document.getElementById('detailHero');
        const contentDiv = document.getElementById('detailContent');
        
        modal.style.display = 'flex';
        heroDiv.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:280px"><div class="loading-spinner"></div> Loading...</div>';
        contentDiv.innerHTML = '';
        
        const details = await GameAPI.getGameDetails(gameId);
        
        if (details) {
            heroDiv.style.backgroundImage = `url(${details.background_image || 'https://placehold.co/1200x400/1e1b2e/8b5cf6?text=' + encodeURIComponent(title)})`;
            heroDiv.style.backgroundSize = 'cover';
            heroDiv.style.backgroundPosition = 'center';
            heroDiv.innerHTML = '';
            
            contentDiv.innerHTML = `
                <h2 class="detail-title">${this.escapeHtml(details.name)}</h2>
                <div class="detail-meta">
                    <div class="detail-meta-item"><i class="fas fa-calendar"></i> ${details.released || 'TBA'}</div>
                    <div class="detail-meta-item"><i class="fas fa-star"></i> ${details.rating}/5 (${details.ratings_count || 0} reviews)</div>
                    ${details.metacritic ? `<div class="detail-meta-item"><i class="fas fa-chart-line"></i> Metascore: ${details.metacritic}</div>` : ''}
                </div>
                <div class="detail-description">${details.description_raw || 'No description available.'}</div>
                <div class="detail-meta">
                    ${details.genres ? `<div><strong>Genres:</strong> ${details.genres.map(g => g.name).join(', ')}</div>` : ''}
                    ${details.platforms ? `<div><strong>Platforms:</strong> ${details.platforms.slice(0,5).map(p => p.platform.name).join(', ')}</div>` : ''}
                </div>
                <div class="detail-links">
                    ${details.website ? `<a href="${details.website}" target="_blank" class="detail-link"><i class="fas fa-globe"></i> Official Website</a>` : ''}
                    ${details.reddit_url ? `<a href="${details.reddit_url}" target="_blank" class="detail-link"><i class="fab fa-reddit"></i> Reddit</a>` : ''}
                </div>
            `;
        } else {
            heroDiv.innerHTML = '';
            contentDiv.innerHTML = `<p style="padding:2rem; text-align:center">Failed to load game details.</p>`;
        }
    },
    
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
    },
    
    openEditModal(id) {
        const game = this.gamesData.find(g => g.id == id);
        if (game) {
            document.getElementById('modalTitle').innerText = '✏️ Edit Game';
            document.getElementById('gameId').value = game.id;
            document.getElementById('title').value = game.title;
            document.getElementById('platform').value = game.platform || '';
            document.getElementById('genre').value = game.genre || '';
            document.getElementById('tags').value = game.tags || '';
            document.getElementById('progress').value = game.progress;
            document.getElementById('rating').value = game.rating;
            document.getElementById('hours_played').value = game.hours_played || 0;
            document.getElementById('status').value = game.status;
            this.currentCoverUrl = game.cover_url;
            if (this.currentCoverUrl) {
                document.getElementById('coverPreview').src = this.currentCoverUrl;
                document.getElementById('coverPreviewContainer').style.display = 'block';
            }
            document.getElementById('gameModal').style.display = 'flex';
        }
    },
    
    showDeleteConfirm(id) {
        this.deleteId = id;
        document.getElementById('deleteModal').style.display = 'flex';
    },
    
    closeModal() {
        document.getElementById('gameModal').style.display = 'none';
        document.getElementById('gameForm').reset();
        document.getElementById('gameId').value = '';
        document.getElementById('coverPreviewContainer').style.display = 'none';
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('gameSearchInput').value = '';
        this.currentCoverUrl = null;
    },
    
    closeDeleteModal() {
        document.getElementById('deleteModal').style.display = 'none';
        this.deleteId = null;
    },
    
    closeDetailModal() {
        document.getElementById('detailModal').style.display = 'none';
    }
};

// ============================================
// 5. DATABASE MANAGER (Supabase)
// ============================================
const DBManager = {
    client: null,
    
    init() {
        this.client = supabase.createClient(Config.SUPABASE_URL, Config.SUPABASE_KEY);
    },
    
    async fetchGames() {
        try {
            const { data, error } = await this.client.from('games').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            UIController.gamesData = data || [];
            await UIController.renderLibrary();
            UIController.updateCharts(UIController.gamesData);
            this.updateDashboard();
            this.updateFilters();
            return UIController.gamesData;
        } catch (error) {
            Config.showError('Database Error', 'Failed to load games');
            return [];
        }
    },
    
    async saveGame(event) {
        event.preventDefault();
        const id = document.getElementById('gameId')?.value;
        const game = {
            title: document.getElementById('title')?.value,
            platform: document.getElementById('platform')?.value || null,
            genre: document.getElementById('genre')?.value || null,
            tags: document.getElementById('tags')?.value || null,
            progress: parseInt(document.getElementById('progress')?.value || 0),
            rating: parseFloat(document.getElementById('rating')?.value || 3),
            hours_played: parseFloat(document.getElementById('hours_played')?.value || 0),
            status: document.getElementById('status')?.value,
            cover_url: UIController.currentCoverUrl || null,
            updated_at: new Date().toISOString()
        };
        
        if (!game.title) {
            Config.showError('Validation Error', 'Game title is required!');
            return;
        }
        
        try {
            if (id) {
                const { error } = await this.client.from('games').update(game).eq('id', id);
                if (error) throw error;
                Config.showSuccess('Game updated successfully!');
            } else {
                const { error } = await this.client.from('games').insert([{ ...game, created_at: new Date().toISOString() }]);
                if (error) throw error;
                Config.showSuccess('Game added successfully!');
            }
            UIController.closeModal();
            this.fetchGames();
        } catch (error) {
            Config.showError('Save Error', 'Failed to save game');
        }
    },
    
    async deleteGame(id) {
        try {
            const { error } = await this.client.from('games').delete().eq('id', id);
            if (error) throw error;
            Config.showSuccess('Game deleted!');
            this.fetchGames();
        } catch (error) {
            Config.showError('Delete Error', 'Failed to delete game');
        }
    },
    
    updateDashboard() {
        const data = UIController.gamesData;
        const total = data.length;
        const completed = data.filter(g => g.status === 'completed').length;
        const totalHours = data.reduce((sum, g) => sum + (g.hours_played || 0), 0);
        const avgRating = total > 0 ? (data.reduce((sum, g) => sum + (g.rating || 0), 0) / total).toFixed(1) : 0;
        
        document.getElementById('totalGames').innerText = total;
        document.getElementById('completedGames').innerText = completed;
        document.getElementById('totalHours').innerText = totalHours;
        document.getElementById('avgRating').innerText = avgRating;
    },
    
    updateFilters() {
        const data = UIController.gamesData;
        const genres = [...new Set(data.map(g => g.genre).filter(Boolean))];
        const platforms = [...new Set(data.map(g => g.platform).filter(Boolean))];
        
        const genreSelect = document.getElementById('filterGenre');
        const platformSelect = document.getElementById('filterPlatform');
        
        if (genreSelect) {
            genreSelect.innerHTML = '<option value="">🎮 All Genres</option>' + genres.map(g => `<option value="${UIController.escapeHtml(g)}">${UIController.escapeHtml(g)}</option>`).join('');
        }
        if (platformSelect) {
            platformSelect.innerHTML = '<option value="">💻 All Platforms</option>' + platforms.map(p => `<option value="${UIController.escapeHtml(p)}">${UIController.escapeHtml(p)}</option>`).join('');
        }
    },
    
    setupRealtime() {
        this.client.channel('games-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => this.fetchGames())
            .subscribe();
    }
};

// ============================================
// 6. APP INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Game Tracker Premium Initializing...');
    
    Config.init();
    DBManager.init();
    UIController.setupGameSearch();
    
    // Tab switching
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const tab = link.dataset.tab;
            document.getElementById('dashboardSection').classList.toggle('active', tab === 'dashboard');
            document.getElementById('librarySection').classList.toggle('active', tab === 'library');
            document.getElementById('pageTitle').innerText = tab === 'dashboard' ? '📊 Dashboard' : '🎮 Game Library';
            if (tab === 'library') UIController.renderLibrary();
        });
    });
    
    // Dark mode
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        const saved = localStorage.getItem('darkMode') === 'true';
        darkModeToggle.checked = saved;
        if (saved) document.body.classList.add('dark-mode');
        darkModeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode', darkModeToggle.checked);
            localStorage.setItem('darkMode', darkModeToggle.checked);
            UIController.updateCharts(UIController.gamesData);
        });
    }
    
    // Buttons
    document.getElementById('addGameBtn').addEventListener('click', () => {
        document.getElementById('modalTitle').innerText = '🎮 Add New Game';
        document.getElementById('gameForm').reset();
        document.getElementById('gameId').value = '';
        document.getElementById('progress').value = 0;
        document.getElementById('rating').value = 3;
        document.getElementById('hours_played').value = 0;
        document.getElementById('status').value = 'backlog';
        document.getElementById('coverPreviewContainer').style.display = 'none';
        UIController.currentCoverUrl = null;
        document.getElementById('gameModal').style.display = 'flex';
    });
    
    // Close modals
    document.querySelectorAll('.close-modal, .modal').forEach(el => {
        el.addEventListener('click', function(e) {
            if (e.target === this || e.target.classList.contains('close-modal')) {
                UIController.closeModal();
                UIController.closeDeleteModal();
                UIController.closeDetailModal();
            }
        });
    });
    
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => UIController.closeDeleteModal());
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        if (UIController.deleteId) DBManager.deleteGame(UIController.deleteId);
        UIController.closeDeleteModal();
    });
    document.getElementById('gameForm').addEventListener('submit', (e) => DBManager.saveGame(e));
    
    // Filters
    document.getElementById('searchInput').addEventListener('input', () => UIController.renderLibrary());
    document.getElementById('filterGenre').addEventListener('change', () => UIController.renderLibrary());
    document.getElementById('filterPlatform').addEventListener('change', () => UIController.renderLibrary());
    document.getElementById('filterRating').addEventListener('change', () => UIController.renderLibrary());
    document.getElementById('filterStatus').addEventListener('change', () => UIController.renderLibrary());
    
    // Load data
    await DBManager.fetchGames();
    DBManager.setupRealtime();
    
    console.log('✅ Game Tracker Premium Ready!');
});