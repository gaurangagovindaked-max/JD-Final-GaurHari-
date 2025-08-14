// Dashboard Application
class SevaDashboard {
    constructor() {
        this.currentPage = 'home';
        this.dataCache = null;
        this.updateInterval = null;
        this.isUpdating = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMobileMenu();
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
                    this.applyStatusColor(tr, value);
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

    applyStatusColor(row, status) {
        const statusLower = status.toString().toLowerCase().trim();
        
        // Remove existing status classes
        row.classList.remove('status-working', 'status-issue', 'status-critical');
        
        // Handle exact Google Sheets values and variations
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
        // Removed critical status handling as requested
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

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sevaDashboard = new SevaDashboard();
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