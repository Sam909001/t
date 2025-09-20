// Table management and utilities
class TableManager {
    constructor() {
        this.tables = new Map();
        this.sortStates = new Map();
    }

    // Initialize table manager
    init() {
        this.setupTableHandlers();
        console.log('TableManager initialized');
    }

    // Setup global table handlers
    setupTableHandlers() {
        // Setup sortable headers
        document.querySelectorAll('table th[data-sortable]').forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const table = header.closest('table');
                const column = header.dataset.sortable;
                this.sortTable(table, column);
            });
        });

        // Setup row selection
        this.setupRowSelection();
    }

    // Setup row selection functionality
    setupRowSelection() {
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.closest('table')) {
                const table = e.target.closest('table');
                
                if (e.target.id === 'selectAllPackages') {
                    this.handleSelectAll(table, e.target.checked);
                } else if (e.target.classList.contains('row-checkbox')) {
                    this.handleRowSelection(table, e.target);
                }
            }
        });
    }

    // Handle select all checkbox
    handleSelectAll(table, checked) {
        const checkboxes = table.querySelectorAll('.row-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            this.updateRowState(checkbox.closest('tr'), checked);
        });
    }

    // Handle individual row selection
    handleRowSelection(table, checkbox) {
        const row = checkbox.closest('tr');
        this.updateRowState(row, checkbox.checked);
        
        // Update select all checkbox state
        const selectAllCheckbox = table.querySelector('#selectAllPackages');
        if (selectAllCheckbox) {
            const allCheckboxes = table.querySelectorAll('.row-checkbox');
            const checkedCount = table.querySelectorAll('.row-checkbox:checked').length;
            
            selectAllCheckbox.checked = checkedCount === allCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
        }
    }

    // Update row visual state
    updateRowState(row, selected) {
        if (selected) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    }

    // Sort table by column
    sortTable(table, column) {
        const tableId = table.id;
        const currentSort = this.sortStates.get(tableId) || {};
        const isAscending = currentSort.column === column ? !currentSort.ascending : true;
        
        // Update sort state
        this.sortStates.set(tableId, { column, ascending: isAscending });
        
        // Get table body and rows
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr:not(.empty-state-row)'));
        
        if (rows.length === 0) return;
        
        // Find column index
        const headers = table.querySelectorAll('th');
        let columnIndex = -1;
        headers.forEach((header, index) => {
            if (header.dataset.sortable === column) {
                columnIndex = index;
            }
        });
        
        if (columnIndex === -1) return;
        
        // Sort rows
        rows.sort((a, b) => {
            const aValue = this.getCellValue(a.cells[columnIndex]);
            const bValue = this.getCellValue(b.cells[columnIndex]);
            
            if (aValue < bValue) return isAscending ? -1 : 1;
            if (aValue > bValue) return isAscending ? 1 : -1;
            return 0;
        });
        
        // Reorder rows in DOM
        rows.forEach(row => tbody.appendChild(row));
        
        // Update header indicators
        this.updateSortIndicators(table, column, isAscending);
    }

    // Get cell value for sorting
    getCellValue(cell) {
        if (!cell) return '';
        
        const text = cell.textContent.trim();
        
        // Try to parse as number
        const number = parseFloat(text.replace(/[^\d.-]/g, ''));
        if (!isNaN(number)) return number;
        
        // Try to parse as date
        const date = new Date(text);
        if (!isNaN(date.getTime())) return date.getTime();
        
        // Return as lowercase string
        return text.toLowerCase();
    }

    // Update sort indicators in headers
    updateSortIndicators(table, activeColumn, isAscending) {
        const headers = table.querySelectorAll('th[data-sortable]');
        
        headers.forEach(header => {
            const column = header.dataset.sortable;
            
            // Remove existing indicators
            header.classList.remove('sorted-asc', 'sorted-desc');
            
            // Add indicator for active column
            if (column === activeColumn) {
                header.classList.add(isAscending ? 'sorted-asc' : 'sorted-desc');
            }
        });
    }

    // Filter table rows
    filterTable(table, filterFn) {
        const tbody = table.querySelector('tbody');
        const rows = tbody.querySelectorAll('tr:not(.empty-state-row)');
        
        let visibleCount = 0;
        rows.forEach(row => {
            const shouldShow = filterFn(row);
            row.style.display = shouldShow ? '' : 'none';
            if (shouldShow) visibleCount++;
        });
        
        // Update empty state
        this.updateEmptyState(table, visibleCount === 0);
        
        return visibleCount;
    }

    // Update empty state message
    updateEmptyState(table, isEmpty) {
        const tbody = table.querySelector('tbody');
        let emptyRow = tbody.querySelector('.empty-state-row');
        
        if (isEmpty) {
            if (!emptyRow) {
                const columnCount = table.querySelectorAll('thead th').length;
                emptyRow = document.createElement('tr');
                emptyRow.className = 'empty-state-row';
                const td = document.createElement('td');
                td.colSpan = columnCount;
                td.style.textAlign = 'center';
                td.style.color = '#666';
                td.style.padding = '2rem';
                td.textContent = 'Gösterilecek veri bulunamadı';
                emptyRow.appendChild(td);
                tbody.appendChild(emptyRow);
            }
            emptyRow.style.display = '';
        } else if (emptyRow) {
            emptyRow.style.display = 'none';
        }
    }

    // Export table to CSV
    exportTableToCSV(table, filename) {
        const headers = Array.from(table.querySelectorAll('thead th'))
            .map(th => th.textContent.trim());
        
        const visibleRows = Array.from(table.querySelectorAll('tbody tr:not(.empty-state-row)'))
            .filter(row => row.style.display !== 'none');
        
        const data = visibleRows.map(row => {
            return Array.from(row.cells).map(cell => {
                // Clean cell text (remove buttons, badges, etc.)
                const clone = cell.cloneNode(true);
                clone.querySelectorAll('button, .btn, .badge').forEach(el => el.remove());
                return clone.textContent.trim().replace(/"/g, '""');
            });
        });
        
        const csvContent = [headers, ...data]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        this.downloadFile(csvContent, filename, 'text/csv');
    }

    // Download file utility
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Get selected rows from table
    getSelectedRows(table) {
        return Array.from(table.querySelectorAll('tbody tr.selected'));
    }

    // Get selected row data
    getSelectedRowData(table, dataExtractor) {
        const selectedRows = this.getSelectedRows(table);
        return selectedRows.map(row => dataExtractor(row));
    }

    // Clear all selections in table
    clearTableSelection(table) {
        const checkboxes = table.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            if (checkbox.closest('tr')) {
                checkbox.closest('tr').classList.remove('selected');
            }
        });
        
        // Also clear select all checkbox
        const selectAllCheckbox = table.querySelector('#selectAllPackages');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }

    // Highlight table row temporarily
    highlightRow(row, duration = 2000) {
        row.classList.add('highlighted');
        setTimeout(() => {
            row.classList.remove('highlighted');
        }, duration);
    }

    // Scroll to table row
    scrollToRow(row) {
        row.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        this.highlightRow(row);
    }

    // Find row by data attribute
    findRowByData(table, attribute, value) {
        return table.querySelector(`tbody tr[data-${attribute}="${value}"]`);
    }

    // Update table cell
    updateCell(row, columnIndex, content) {
        const cell = row.cells[columnIndex];
        if (cell) {
            if (typeof content === 'string') {
                cell.textContent = content;
            } else {
                cell.innerHTML = '';
                if (typeof content === 'object' && content.nodeType === 1) {
                    cell.appendChild(content);
                } else {
                    cell.innerHTML = content;
                }
            }
        }
    }

    // Add table row
    addTableRow(table, rowData, position = 'end') {
        const tbody = table.querySelector('tbody');
        const row = document.createElement('tr');
        
        // Add data attributes if provided
        if (rowData.attributes) {
            Object.entries(rowData.attributes).forEach(([key, value]) => {
                row.setAttribute(`data-${key}`, value);
            });
        }
        
        // Add cells
        rowData.cells.forEach(cellContent => {
            const cell = document.createElement('td');
            if (typeof cellContent === 'string') {
                cell.textContent = cellContent;
            } else if (typeof cellContent === 'object' && cellContent.nodeType === 1) {
                cell.appendChild(cellContent);
            } else {
                cell.innerHTML = cellContent;
            }
            row.appendChild(cell);
        });
        
        // Add row to table
        if (position === 'start') {
            tbody.insertBefore(row, tbody.firstChild);
        } else {
            tbody.appendChild(row);
        }
        
        // Remove empty state if it exists
        this.updateEmptyState(table, false);
        
        return row;
    }

    // Remove table row
    removeTableRow(row) {
        const table = row.closest('table');
        row.remove();
        
        // Check if table is now empty
        const remainingRows = table.querySelectorAll('tbody tr:not(.empty-state-row)');
        this.updateEmptyState(table, remainingRows.length === 0);
    }

    // Setup table pagination
    setupPagination(table, rowsPerPage = 10) {
        const tableId = table.id;
        const tbody = table.querySelector('tbody');
        const allRows = Array.from(tbody.querySelectorAll('tr:not(.empty-state-row)'));
        
        if (allRows.length <= rowsPerPage) {
            // No need for pagination
            return;
        }
        
        let currentPage = 1;
        const totalPages = Math.ceil(allRows.length / rowsPerPage);
        
        // Create pagination controls
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'table-pagination';
        
        table.parentNode.insertBefore(paginationContainer, table.nextSibling);
        
        const showPage = (page) => {
            const startIndex = (page - 1) * rowsPerPage;
            const endIndex = startIndex + rowsPerPage;
            
            allRows.forEach((row, index) => {
                row.style.display = (index >= startIndex && index < endIndex) ? '' : 'none';
            });
            
            currentPage = page;
            updatePaginationControls();
        };
        
        const updatePaginationControls = () => {
            const startRow = (currentPage - 1) * rowsPerPage + 1;
            const endRow = Math.min(currentPage * rowsPerPage, allRows.length);
            
            paginationContainer.innerHTML = `
                <div class="pagination-info">
                    ${startRow}-${endRow} / ${allRows.length} kayıt gösteriliyor
                </div>
                <div class="pagination-controls">
                    <button class="btn btn-sm btn-secondary prev-btn" ${currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Önceki
                    </button>
                    <span style="margin: 0 1rem;">Sayfa ${currentPage} / ${totalPages}</span>
                    <button class="btn btn-sm btn-secondary next-btn" ${currentPage === totalPages ? 'disabled' : ''}>
                        Sonraki <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            `;
            
            // Add event handlers
            const prevBtn = paginationContainer.querySelector('.prev-btn');
            const nextBtn = paginationContainer.querySelector('.next-btn');
            
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) showPage(currentPage - 1);
            });
            
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) showPage(currentPage + 1);
            });
        };
        
        // Show first page
        showPage(1);
        
        // Store pagination functions for external access
        this.tables.set(tableId, {
            showPage,
            currentPage: () => currentPage,
            totalPages: () => totalPages
        });
    }

    // Get table instance
    getTable(tableId) {
        return this.tables.get(tableId);
    }

    // Refresh table data
    refreshTable(table) {
        // Clear current selection
        this.clearTableSelection(table);
        
        // Reset sort state
        const tableId = table.id;
        this.sortStates.delete(tableId);
        
        // Clear sort indicators
        table.querySelectorAll('th').forEach(header => {
            header.classList.remove('sorted-asc', 'sorted-desc');
        });
        
        // Show all rows
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            row.style.display = '';
        });
        
        // Update empty state
        this.updateEmptyState(table, rows.length === 0);
        
        console.log(`Table ${tableId} refreshed`);
    }

    // Get visible rows count
    getVisibleRowCount(table) {
        return table.querySelectorAll('tbody tr:not(.empty-state-row):not([style*="display: none"])').length;
    }

    // Get all rows count
    getAllRowCount(table) {
        return table.querySelectorAll('tbody tr:not(.empty-state-row)').length;
    }
}

// Create global instance
window.TableManager = new TableManager();
