// Dashboard Application
class SevaDashboard {
    constructor() {
        this.currentPage = 'home';
        this.dataCache = null;
        this.updateInterval = null;
        this.isUpdating = false;
        this.cctvData = { liveIssues: [], resolved: [] };
        this.cctvUpdateInterval = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMobileMenu();
        this.setupCCTVDashboard();
        this.startDataUpdates();
        this.hideLoadingOverlay();
    }

    setupEventListeners() {
        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateToPage(page);
            });
        });

        // Stat cards navigation
        document.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', () => {
                const page = card.getAttribute('data-navigate');
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });

        // Search and filter functionality
        this.setupSearchAndFilters();
    }

    setupSearchAndFilters() {
        // LED/TV filters
        const ledTvSearch = document.getElementById('led-tv-search');
        const ledTvStatusFilter = document.getElementById('led-tv-status-filter');
        const ledTvZoneFilter = document.getElementById('led-tv-zone-filter');

        if (ledTvSearch) {
            ledTvSearch.addEventListener('input', () => this.filterTable('led-tv'));
        }
        if (ledTvStatusFilter) {
            ledTvStatusFilter.addEventListener('change', () => this.filterTable('led-tv'));
        }
        if (ledTvZoneFilter) {
            ledTvZoneFilter.addEventListener('change', () => this.filterTable('led-tv'));
        }

        // Equipment filters
        const equipmentSearch = document.getElementById('equipment-search');
        const equipmentStatusFilter = document.getElementById('equipment-status-filter');
        const equipmentZoneFilter = document.getElementById('equipment-zone-filter');

        if (equipmentSearch) {
            equipmentSearch.addEventListener('input', () => this.filterTable('equipment'));
        }
        if (equipmentStatusFilter) {
            equipmentStatusFilter.addEventListener('change', () => this.filterTable('equipment'));
        }
        if (equipmentZoneFilter) {
            equipmentZoneFilter.addEventListener('change', () => this.filterTable('equipment'));
        }

        // PA filters
        const paSearch = document.getElementById('pa-search');
        const paStatusFilter = document.getElementById('pa-status-filter');
        const paZoneFilter = document.getElementById('pa-zone-filter');

        if (paSearch) {
            paSearch.addEventListener('input', () => this.filterTable('pa'));
        }
        if (paStatusFilter) {
            paStatusFilter.addEventListener('change', () => this.filterTable('pa'));
        }
        if (paZoneFilter) {
            paZoneFilter.addEventListener('change', () => this.filterTable('pa'));
        }
    }

    setupMobileMenu() {
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.getElementById('sidebar');

        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && 
                    !sidebar.contains(e.target) && 
                    !mobileToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            });
        }
    }

    navigateToPage(page) {
        // Update navigation active state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Hide all pages
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.style.display = 'none';
        });

        // Show target page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.style.display = 'block';
            targetPage.classList.add('fade-in');
        }

        this.currentPage = page;

        // Handle page-specific data updates
        if (page === 'cctv') {
            // Stop regular dashboard updates
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            // Start CCTV updates
            this.startCCTVUpdates();
        } else {
            // Stop CCTV updates
            if (this.cctvUpdateInterval) {
                clearInterval(this.cctvUpdateInterval);
                this.cctvUpdateInterval = null;
            }
            // Start regular dashboard updates for other pages
            if (page !== 'cctv') {
                this.startDataUpdates();
            }
        }

        // Close mobile menu if open
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    }

    async startDataUpdates() {
        // Initial data load
        await this.fetchData();
        
        // Set up interval for updates every 2 seconds
        this.updateInterval = setInterval(() => {
            this.fetchData();
        }, 2000);
    }

    async fetchData() {
        if (this.isUpdating) return; // Prevent overlapping requests
        
        this.isUpdating = true;
        
        try {
            const response = await fetch('/api/data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Only update if data has changed
            if (JSON.stringify(data) !== JSON.stringify(this.dataCache)) {
                this.dataCache = data;
                this.updateUI(data);
            }
            
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showError('Failed to fetch data. Retrying...');
        } finally {
            this.isUpdating = false;
        }
    }

    updateUI(data) {
        this.updateStatistics(data.statistics);
        this.updateLastUpdated(data.last_updated);
        this.updateTables(data);
        this.updateZoneStatus(data);
    }

    updateStatistics(stats) {
        // Update LED/TV stats
        this.updateStatCard('led-tv', stats.led_tv);
        
        // Update Equipment stats
        this.updateStatCard('equipment', stats.equipment);
        
        // Update PA stats
        this.updateStatCard('pa', stats.pa);
        
        // Update CCTV stats
        this.updateStatCard('cctv', stats.cctv);
    }

    updateStatCard(type, stats) {
        const totalEl = document.getElementById(`${type}-total`);
        const workingEl = document.getElementById(`${type}-working`);
        const issuesEl = document.getElementById(`${type}-issues`);

        if (totalEl) totalEl.textContent = stats.total;
        if (workingEl) workingEl.textContent = `${stats.working} Working`;
        if (issuesEl) issuesEl.textContent = `${stats.issues} Issues`;

        // Update placeholder totals for PA and CCTV
        const placeholderEl = document.getElementById(`${type}-placeholder-total`);
        if (placeholderEl) placeholderEl.textContent = stats.total;
    }

    updateLastUpdated(timestamp) {
        const lastUpdatedEl = document.getElementById('last-updated-time');
        if (lastUpdatedEl && timestamp) {
            const date = new Date(timestamp);
            lastUpdatedEl.textContent = date.toLocaleTimeString();
        }
    }

    updateTables(data) {
        // Update LED/TV table - using correct column names from CSV
        this.updateTable('led-tv', data.led_tv_data, [
            'TIME STAMP', 'NAME', 'Phone No', 'ZONE', 'SECTOR', 'SCREEN ID', 'STATUS', 'EVIDENCE'
        ]);

        // Update Equipment table - using correct column names from CSV to match Google Sheets
        this.updateTable('equipment', data.equipment_data, [
            'TIME STAMP', 'NAME', 'PHONE NO', 'ZONE', 'SECTOR', 'LOCATION', 'EQUIPMENT', 'STATUS', 'EVIDENCE'
        ]);

        // Update PA table - using correct column names from CSV to match Google Sheets
        this.updateTable('pa', data.pa_data, [
            'TIME STAMP', 'NAME', 'PHONE NO', 'ZONE', 'SECTOR', 'LOCATION', 'PA EQUIPMENT', 'STATUS', 'EVIDENCE'
        ]);
    }

    updateTable(type, data, columns) {
        const tbody = document.getElementById(`${type}-tbody`);
        if (!tbody) return;

        // Clear existing rows
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns.length + 1}" class="loading-row">No data available</td></tr>`;
            return;
        }

        // Add data rows
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            
            // Add row number
            const numberCell = document.createElement('td');
            numberCell.textContent = index + 1;
            tr.appendChild(numberCell);

            // Add data cells
            columns.forEach(column => {
                const cell = document.createElement('td');
                const value = row[column] || '';
                
                if (column === 'STATUS') {
                    cell.textContent = value;
                    const alertState = row['ALERT_STATE'] || 'normal';
                    this.applyStatusColor(tr, value, alertState);
                } else if (column === 'EVIDENCE' && value && value.startsWith('http')) {
                    const link = document.createElement('a');
                    link.href = value;
                    link.textContent = 'View';
                    link.className = 'evidence-link';
                    link.target = '_blank';
                    cell.appendChild(link);
                } else if (column === 'ZONE') {
                    // Display zone value
                    cell.textContent = value.toString().trim();
                } else {
                    cell.textContent = value;
                }
                
                tr.appendChild(cell);
            });

            tbody.appendChild(tr);
        });

        // Apply current filters
        this.filterTable(type);
    }

    applyStatusColor(row, status, alertState = 'normal') {
        const statusLower = status.toString().toLowerCase().trim();
        
        // Remove existing status and alert classes
        row.classList.remove('status-working', 'status-issue', 'status-critical', 'alert-overdue-issue', 'alert-stale-update');
        
        // Apply base status color
        if (statusLower.includes('working-fine') || statusLower.includes('working') || 
            statusLower.includes('fine') || statusLower.includes('ok') || statusLower === 'yes') {
            row.classList.add('status-working');
        } else if (statusLower.includes('issue-reporting') || statusLower.includes('issue') || 
                   statusLower.includes('reporting') || statusLower.includes('problem') || 
                   statusLower.includes('not working') || statusLower.includes('broken') || 
                   statusLower.includes('fault') || statusLower.includes('test') || 
                   statusLower.includes('error') || statusLower === 'no') {
            row.classList.add('status-issue');
        }
        
        // Apply alert state classes for time-based alerts
        if (alertState === 'overdue-issue') {
            row.classList.add('alert-overdue-issue');
        } else if (alertState === 'stale-update') {
            row.classList.add('alert-stale-update');
        }
    }

    filterTable(type) {
        const searchInput = document.getElementById(`${type}-search`);
        const statusFilter = document.getElementById(`${type}-status-filter`);
        const zoneFilter = document.getElementById(`${type}-zone-filter`);
        const tbody = document.getElementById(`${type}-tbody`);

        if (!tbody) return;

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const statusFilterValue = statusFilter ? statusFilter.value.toLowerCase() : '';
        const zoneFilterValue = zoneFilter ? zoneFilter.value : '';

        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 0) return; // Skip empty rows

            const rowText = Array.from(cells).map(cell => cell.textContent.toLowerCase()).join(' ');
            const statusCell = cells[cells.length - 2]; // Status is second to last column
            const zoneCell = cells[4]; // Zone is 5th column (index 4)
            
            let showRow = true;

            // Apply search filter
            if (searchTerm && !rowText.includes(searchTerm)) {
                showRow = false;
            }

            // Apply status filter
            if (statusFilterValue && statusCell) {
                const statusText = statusCell.textContent.toLowerCase().trim();
                if (statusFilterValue === 'working' && 
                    !(statusText.includes('working-fine') || statusText.includes('working') || 
                      statusText.includes('fine') || statusText.includes('ok') || statusText === 'yes')) {
                    showRow = false;
                } else if (statusFilterValue === 'issue' && 
                    !(statusText.includes('issue-reporting') || statusText.includes('issue') || 
                      statusText.includes('reporting') || statusText.includes('problem') || 
                      statusText.includes('not working') || statusText.includes('broken') || statusText === 'no')) {
                    showRow = false;
                }
            }

            // Apply zone filter
            if (zoneFilterValue && zoneCell && zoneCell.textContent !== zoneFilterValue) {
                showRow = false;
            }

            row.style.display = showRow ? '' : 'none';
        });
    }

    updateZoneStatus(data) {
        // Calculate zone status based on data
        const zones = {
            'Zone 1': { sectors: ['1', '2'], issues: 0, total: 0 },
            'Zone 2': { sectors: ['3', '4', '5', '6'], issues: 0, total: 0 },
            'Zone 3': { sectors: ['7', '8', '11'], issues: 0, total: 0 },
            'Zone 4': { sectors: ['9', '10'], issues: 0, total: 0 }
        };

        // Count issues and totals for each zone
        const allData = [...(data.led_tv_data || []), ...(data.equipment_data || [])];
        
        allData.forEach(item => {
            const zone = item.ZONE || item.Zone;
            const status = (item.STATUS || item.Status || '').toLowerCase();
            
            if (zones[zone]) {
                zones[zone].total++;
                if (status.includes('issue') || status.includes('problem') || 
                    status.includes('not working') || status.includes('broken')) {
                    zones[zone].issues++;
                }
            }
        });

        // Update zone status displays
        Object.keys(zones).forEach(zoneName => {
            const zoneNumber = zoneName.split(' ')[1];
            const statusEl = document.getElementById(`zone-${zoneNumber}-status`);
            
            if (statusEl) {
                const zone = zones[zoneName];
                if (zone.total === 0) {
                    statusEl.textContent = 'No Data';
                    statusEl.style.backgroundColor = '#e9ecef';
                    statusEl.style.color = '#6c757d';
                } else if (zone.issues === 0) {
                    statusEl.textContent = 'All Good';
                    statusEl.style.backgroundColor = '#d4edda';
                    statusEl.style.color = '#155724';
                } else {
                    statusEl.textContent = `${zone.issues} Issue${zone.issues > 1 ? 's' : ''}`;
                    statusEl.style.backgroundColor = '#f8d7da';
                    statusEl.style.color = '#721c24';
                }
            }
        });
    }

    hideLoadingOverlay() {
        setTimeout(() => {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 300);
            }
        }, 1000);
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper notification system
        console.error(message);
        
        // Update last updated time to show error
        const lastUpdatedEl = document.getElementById('last-updated-time');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = 'Connection Error';
            lastUpdatedEl.style.color = '#dc3545';
            
            // Reset color after 3 seconds
            setTimeout(() => {
                lastUpdatedEl.style.color = '';
            }, 3000);
        }
    }

    setupCCTVDashboard() {
        // Setup CCTV slider functionality
        const sliderTabs = document.querySelectorAll('.slider-tab');
        sliderTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const section = tab.getAttribute('data-section');
                this.switchCCTVSection(section);
            });
        });

        // Setup refresh buttons
        const refreshLive = document.getElementById('refresh-live');
        const refreshResolved = document.getElementById('refresh-resolved');
        
        if (refreshLive) {
            refreshLive.addEventListener('click', () => this.refreshCCTVData());
        }
        
        if (refreshResolved) {
            refreshResolved.addEventListener('click', () => this.refreshCCTVData());
        }

        // Setup search functionality
        const liveSearch = document.getElementById('live-search');
        const resolvedSearch = document.getElementById('resolved-search');
        
        if (liveSearch) {
            liveSearch.addEventListener('input', () => this.filterCCTVCards('live'));
        }
        
        if (resolvedSearch) {
            resolvedSearch.addEventListener('input', () => this.filterCCTVCards('resolved'));
        }

        // Start CCTV data updates
        this.startCCTVUpdates();
    }

    switchCCTVSection(section) {
        // Update tab states
        document.querySelectorAll('.slider-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update section visibility
        document.querySelectorAll('.cctv-section').forEach(sec => {
            sec.style.display = 'none';
            sec.classList.remove('active');
        });
        
        const targetSection = document.getElementById(`${section}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
        }
    }

    async startCCTVUpdates() {
        // Initial load
        await this.fetchCCTVData();
        
        // Set up periodic updates every 30 seconds
        this.cctvUpdateInterval = setInterval(() => {
            this.fetchCCTVData();
        }, 30000);
    }

    async fetchCCTVData() {
        try {
            // Fetch from both Live-Update and Resolved tabs
            const liveUrl = 'https://docs.google.com/spreadsheets/d/1KPKr-GZLa2G9twirroyx_atLUsmX9-Xx5-sjK6Co5TU/export?format=csv&gid=1561700426';
            const resolvedUrl = 'https://docs.google.com/spreadsheets/d/1KPKr-GZLa2G9twirroyx_atLUsmX9-Xx5-sjK6Co5TU/export?format=csv&gid=1099893588';
            
            const [liveResponse, resolvedResponse] = await Promise.all([
                fetch(liveUrl),
                fetch(resolvedUrl)
            ]);
            
            const liveCSV = await liveResponse.text();
            const resolvedCSV = await resolvedResponse.text();
            
            // Parse live issues (has STATUS column)
            this.cctvData.liveIssues = this.parseCSV(liveCSV);
            
            // Parse resolved issues (has 6 columns with resolved timestamp at the end)
            const resolvedData = this.parseCSV(resolvedCSV);
            // Add RESOLVED_AT field from the 6th column for resolved issues
            this.cctvData.resolved = resolvedData.map(issue => {
                const keys = Object.keys(issue);
                if (keys.length >= 6) {
                    issue['RESOLVED_AT'] = issue[keys[5]] || '';
                }
                return issue;
            });
            

            
            this.updateCCTVUI();
            
        } catch (error) {
            console.error('Error fetching CCTV data:', error);
            this.showCCTVError('Failed to load CCTV data. Please try again.');
        }
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
        }
        
        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    updateCCTVUI() {
        this.updateCCTVCounts();
        this.renderCCTVCards('live', this.cctvData.liveIssues);
        this.renderCCTVCards('resolved', this.cctvData.resolved);
    }

    updateCCTVCounts() {
        const liveCount = document.getElementById('live-issues-count');
        const resolvedCount = document.getElementById('resolved-count');
        
        if (liveCount) {
            liveCount.textContent = this.cctvData.liveIssues.length;
        }
        
        if (resolvedCount) {
            resolvedCount.textContent = this.cctvData.resolved.length;
        }
    }

    renderCCTVCards(type, data) {
        const gridId = type === 'live' ? 'live-issues-grid' : 'resolved-grid';
        const grid = document.getElementById(gridId);
        
        if (!grid) return;
        
        if (data.length === 0) {
            grid.innerHTML = `
                <div class="no-issues-message">
                    <i class="fas fa-${type === 'live' ? 'check-circle' : 'history'}"></i>
                    <h3>No ${type === 'live' ? 'Live Issues' : 'Resolved Issues'}</h3>
                    <p>${type === 'live' ? 'All systems are running smoothly!' : 'No resolved issues to display.'}</p>
                </div>
            `;
            return;
        }
        
        const cardsHTML = data.map(issue => this.createCCTVCard(issue, type === 'resolved')).join('');
        grid.innerHTML = cardsHTML;
        
        // Initialize media previews
        this.initializeMediaPreviews(grid);
    }

    createCCTVCard(issue, isResolved = false) {
        // Use correct column names from CSV structure
        const issueTimestamp = issue['TIME STAMP'] || issue['Timestamp'] || '';
        const resolvedTimestamp = issue['RESOLVED_AT'] || issue['Resolved_At'] || '';
        const zone = issue['ZONE'] || issue['Zone'] || 'N/A';
        const sector = issue['SECTOR'] || issue['Sector'] || 'N/A';
        const issueDetails = issue['ISSUE'] || issue['Issue'] || issue['Issue-details'] || issue['Issue Details'] || 'N/A';
        const evidence = issue['Evidence'] || issue['Drive Link'] || '';
        
        // Use appropriate timestamp based on card type
        const displayTimestamp = isResolved ? (resolvedTimestamp || issueTimestamp) : issueTimestamp;
        
        const cardClass = isResolved ? 'cctv-card resolved' : 'cctv-card';
        const iconClass = isResolved ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';
        const statusText = isResolved ? 'Resolved' : 'Live Issue';
        
        return `
            <div class="${cardClass}">
                <div class="cctv-card-header">
                    <h4 class="cctv-card-title">
                        <i class="${iconClass}"></i>
                        ${statusText}
                    </h4>
                    <div class="cctv-card-timestamp">${this.formatCCTVTimestamp(displayTimestamp)}</div>
                </div>
                <div class="cctv-card-body">
                    <div class="cctv-card-details">
                        <div class="detail-item">
                            <span class="detail-label">Zone</span>
                            <span class="detail-value">${zone}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Sector</span>
                            <span class="detail-value">${sector}</span>
                        </div>
                    </div>
                    <div class="cctv-card-issue">
                        <div class="issue-label">Issue Details</div>
                        <div class="issue-description">${issueDetails}</div>
                    </div>
                    ${evidence ? this.createMediaPreview(evidence) : ''}
                </div>
            </div>
        `;
    }

    createMediaPreview(driveLink) {
        if (!driveLink || driveLink === 'N/A') {
            return `
                <div class="cctv-card-media">
                    <div class="media-placeholder">
                        <i class="fas fa-image"></i>
                        <span>No media available</span>
                    </div>
                </div>
            `;
        }
        
        // Extract file ID from Google Drive link
        const fileId = this.extractGoogleDriveFileId(driveLink);
        
        if (fileId) {
            const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w300`;
            const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
            
            return `
                <div class="cctv-card-media">
                    <img class="media-preview" 
                         src="${thumbnailUrl}" 
                         alt="Evidence" 
                         data-preview-url="${previewUrl}"
                         onerror="this.parentElement.innerHTML='<div class=\"media-error\"><i class=\"fas fa-exclamation-triangle\"></i><span>Failed to load media</span></div>'">
                </div>
            `;
        }
        
        return `
            <div class="cctv-card-media">
                <div class="media-error">
                    <i class="fas fa-link"></i>
                    <span>Invalid drive link</span>
                </div>
            </div>
        `;
    }

    extractGoogleDriveFileId(url) {
        const patterns = [
            /\/file\/d\/([a-zA-Z0-9-_]+)/,
            /id=([a-zA-Z0-9-_]+)/,
            /\/open\?id=([a-zA-Z0-9-_]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return null;
    }

    initializeMediaPreviews(container) {
        const mediaElements = container.querySelectorAll('.media-preview');
        mediaElements.forEach(img => {
            img.addEventListener('click', () => {
                const previewUrl = img.getAttribute('data-preview-url');
                if (previewUrl) {
                    window.open(previewUrl, '_blank');
                }
            });
            
            img.style.cursor = 'pointer';
            img.title = 'Click to view full size';
        });
    }

    formatCCTVTimestamp(timestamp) {
        if (!timestamp || timestamp === 'N/A') {
            return 'Unknown time';
        }
        
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) {
                return timestamp; // Return original if can't parse
            }
            
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return timestamp;
        }
    }

    filterCCTVCards(type) {
        const searchId = type === 'live' ? 'live-search' : 'resolved-search';
        const gridId = type === 'live' ? 'live-issues-grid' : 'resolved-grid';
        
        const searchInput = document.getElementById(searchId);
        const grid = document.getElementById(gridId);
        
        if (!searchInput || !grid) return;
        
        const searchTerm = searchInput.value.toLowerCase();
        const cards = grid.querySelectorAll('.cctv-card');
        
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const isVisible = text.includes(searchTerm);
            card.style.display = isVisible ? 'block' : 'none';
        });
    }

    refreshCCTVData() {
        const refreshButtons = document.querySelectorAll('.refresh-btn');
        refreshButtons.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
        });
        
        this.fetchCCTVData().finally(() => {
            refreshButtons.forEach(btn => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            });
        });
    }

    showCCTVError(message) {
        const grids = ['live-issues-grid', 'resolved-grid'];
        grids.forEach(gridId => {
            const grid = document.getElementById(gridId);
            if (grid) {
                grid.innerHTML = `
                    <div class="loading-card">
                        <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>
                        <p>${message}</p>
                        <button class="refresh-btn" onclick="dashboard.refreshCCTVData()">
                            <i class="fas fa-sync-alt"></i> Try Again
                        </button>
                    </div>
                `;
            }
        });
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.cctvUpdateInterval) {
            clearInterval(this.cctvUpdateInterval);
        }
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new SevaDashboard();
});

// Handle page visibility changes to pause/resume updates
document.addEventListener('visibilitychange', () => {
    if (window.sevaDashboard) {
        if (document.hidden) {
            // Page is hidden, could pause updates to save resources
            console.log('Dashboard hidden - continuing updates');
        } else {
            // Page is visible, ensure updates are running
            console.log('Dashboard visible - updates active');
        }
    }
});

// Handle window resize for responsive behavior
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
        }
    }
});

// Utility functions
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function truncateText(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SevaDashboard;
}