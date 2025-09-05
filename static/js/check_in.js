// Daily Activities Schedule JavaScript - BreakFree Design System with Firebase Integration
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing schedule...');
    console.log('Current page URL:', window.location.href);
    initializeSchedule();
});

function initializeSchedule() {
    console.log('=== Initializing Daily Activities Schedule ===');
    
    // Check if required elements exist
    const scheduleTable = document.getElementById('scheduleTable');
    const editModeBtn = document.getElementById('editModeBtn');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    
    console.log('Schedule table found:', !!scheduleTable);
    console.log('Edit mode button found:', !!editModeBtn);
    console.log('Save changes button found:', !!saveChangesBtn);
    
    if (!scheduleTable) {
        console.error('Schedule table not found!');
        return;
    }
    
    // Apply table layout fixes
    scheduleTable.classList.add('has-merged-cells');
    
    // Set explicit table layout properties
    scheduleTable.style.width = '100%';
    scheduleTable.style.tableLayout = 'fixed';
    scheduleTable.style.borderCollapse = 'collapse';
    
    // Fix column widths
    const headerCells = scheduleTable.querySelectorAll('thead th');
    headerCells.forEach((cell, index) => {
        if (index === 0) {
            // Time header
            cell.style.width = '120px';
        } else {
            // Day headers
            cell.style.width = `calc((100% - 120px) / 7)`;
        }
    });
    
    // Count activity cells
    const activityCells = document.querySelectorAll('.activity-cell');
    const emptyCells = document.querySelectorAll('.activity-cell.empty-cell');
    console.log(`Found ${activityCells.length} activity cells (${emptyCells.length} empty)`);
    
    // Activities are now static in the HTML template
    console.log('Using static activities from template...');
    
    // Add search functionality
    addSearchBar();
    
    // Add activity highlighting
    highlightCurrentTime();
    
    // Add edit functionality
    addEditFunctionality();
    
    // Add activity filtering
    addActivityFilter();
    
    // Add responsive behavior
    handleResponsiveBehavior();
    
    // Add activity type highlighting
    highlightActivityTypes();
    
    // Apply styling to any existing merged cells
    applyMergedCellStyling();
    
    // Force layout recalculation to fix merged cells
    setTimeout(() => {
        console.log('Forcing layout recalculation for merged cells...');
        scheduleTable.style.display = 'none';
        scheduleTable.offsetHeight; // Force reflow
        scheduleTable.style.display = 'table';
        
        // Apply merged cell styling again after reflow
        applyMergedCellStyling();
    }, 100);
    
    console.log('=== Schedule initialization completed ===');
}



function applyMergedCellStyling() {
    console.log('Applying styling to existing merged cells');
    
    // Get the table element
    const scheduleTable = document.getElementById('scheduleTable');
    if (!scheduleTable) {
        console.error('Schedule table not found');
        return;
    }
    
    // Add the has-merged-cells class to the table
    scheduleTable.classList.add('has-merged-cells');
    
    // Find all existing merged cells (those with rowspan > 1)
    const allCells = document.querySelectorAll('.activity-cell');
    const mergedCells = Array.from(allCells).filter(cell => {
        const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
        return rowspan > 1;
    });
    
    console.log(`Found ${mergedCells.length} existing merged cells`);
    
    // First pass: mark all merged cells
    mergedCells.forEach(cell => {
        // Add merged-activity class if not already present
        if (!cell.classList.contains('merged-activity')) {
            cell.classList.add('merged-activity');
        }
        
        // Set colspan attribute and CSS variable for width calculation
        const colspan = cell.colSpan || 1;
        cell.setAttribute('colspan', colspan);
        cell.style.setProperty('--colspan', colspan);
    });
    
    // Second pass: style all rows and adjacent cells
    mergedCells.forEach(cell => {
        const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
        const colspan = cell.colSpan || 1;
        
        // Find all rows that this merged cell spans
        const currentRow = cell.closest('tr');
        const allRows = Array.from(document.querySelectorAll('tbody tr'));
        const currentRowIndex = allRows.indexOf(currentRow);
        
        const spannedRows = [];
        for (let i = 0; i < rowspan; i++) {
            const rowIndex = currentRowIndex + i;
            if (rowIndex < allRows.length) {
                spannedRows.push(allRows[rowIndex]);
            }
        }
        
        // Style all spanned rows
        spannedRows.forEach(row => {
            // Mark the row as merged
            row.classList.add('merged-row');
            
            // Get all cells in the row
            const allRowCells = Array.from(row.querySelectorAll('td'));
            
            // Style all cells in the row
            allRowCells.forEach(rowCell => {
                if (rowCell !== cell && !rowCell.classList.contains('merged-activity')) {
                    if (rowCell.classList.contains('activity-cell')) {
                        if (!rowCell.classList.contains('hidden-by-merge')) {
                            // This is a visible activity cell that's not merged
                            rowCell.classList.add('adjacent-to-merge');
                        }
                    }
                }
            });
        });
    });
    
    // Third pass: handle empty cells in all rows
    const allRows = document.querySelectorAll('tbody tr');
    allRows.forEach(row => {
        const emptyCells = Array.from(row.querySelectorAll('.activity-cell:empty'));
        emptyCells.forEach(cell => {
            if (!cell.classList.contains('hidden-by-merge')) {
                cell.classList.add('adjacent-to-merge');
            }
        });
    });
    
    console.log('Applied styling to existing merged cells');
}



function parseTimeToMinutes(timeString) {
    // Parse time strings like "5:00AM-5:15AM" or "9:00PM"
    const timeRegex = /(\d{1,2}):(\d{2})(AM|PM)/;
    const match = timeString.match(timeRegex);
    
    if (match) {
        let hour = parseInt(match[1]);
        const minute = parseInt(match[2]);
        const period = match[3];
        
        // Convert to 24-hour format
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        
        return hour * 60 + minute;
    }
    
    return 0;
}

function updateActivityStyling(cell) {
    const activityText = cell.textContent.toLowerCase();
    
    // Remove existing activity classes
    cell.classList.remove(
        'meal-activity',
        'sports-activity',
        'garden-activity',
        'project-activity',
        'cleaning-activity',
        'spiritual-activity'
    );
    
    // Add appropriate class based on activity type
    if (activityText.includes('breakfast') || activityText.includes('lunch') || activityText.includes('dinner')) {
        cell.classList.add('meal-activity');
    } else if (activityText.includes('sports') || activityText.includes('exercise')) {
        cell.classList.add('sports-activity');
    } else if (activityText.includes('gardening')) {
        cell.classList.add('garden-activity');
    } else if (activityText.includes('project')) {
        cell.classList.add('project-activity');
    } else if (activityText.includes('cleaning') || activityText.includes('washing')) {
        cell.classList.add('cleaning-activity');
    } else if (activityText.includes('prayer') || activityText.includes('mass')) {
        cell.classList.add('spiritual-activity');
    }
}

function addSearchBar() {
    const searchInput = document.getElementById('activitySearch');
    if (!searchInput) return;
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterActivities(searchTerm);
    });
}

function filterActivities(searchTerm) {
    const activityCells = document.querySelectorAll('.activity-cell');
    let matchCount = 0;
    
    activityCells.forEach(cell => {
        const activityText = cell.textContent.toLowerCase();
        if (searchTerm === '' || activityText.includes(searchTerm)) {
            cell.style.display = '';
            cell.style.opacity = '1';
            matchCount++;
        } else {
            cell.style.display = 'none';
            cell.style.opacity = '0.3';
        }
    });
}

function highlightCurrentTime() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Find the current time slot
    const timeCells = document.querySelectorAll('.time-cell');
    timeCells.forEach(cell => {
        const timeText = cell.textContent;
        const timeRange = parseTimeRange(timeText);
        
        if (timeRange && currentTime >= timeRange.start && currentTime <= timeRange.end) {
            // Highlight current time row
            const row = cell.closest('tr');
            if (row) {
                row.style.backgroundColor = 'var(--warning-light)';
                row.style.border = '2px solid var(--warning)';
                
                // Add current time indicator
                addCurrentTimeIndicator(row);
                
                // Scroll to current time
                setTimeout(() => {
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            }
        }
    });
}

function parseTimeRange(timeText) {
    // Parse time ranges like "5:00AM-5:15AM" or "9:00PM"
    const timeRegex = /(\d{1,2}):(\d{2})(AM|PM)(?:-(\d{1,2}):(\d{2})(AM|PM))?/;
    const match = timeText.match(timeRegex);
    
    if (match) {
        let startHour = parseInt(match[1]);
        let startMinute = parseInt(match[2]);
        let startPeriod = match[3];
        
        // Convert to 24-hour format
        if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
        if (startPeriod === 'AM' && startHour === 12) startHour = 0;
        
        let startTime = startHour * 60 + startMinute;
        
        if (match[4]) {
            // Has end time
            let endHour = parseInt(match[4]);
            let endMinute = parseInt(match[5]);
            let endPeriod = match[6];
            
            if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
            if (endPeriod === 'AM' && endHour === 12) endHour = 0;
            
            let endTime = endHour * 60 + endMinute;
            
            return { start: startTime, end: endTime };
        } else {
            // Single time point (like 9:00PM)
            return { start: startTime, end: startTime + 15 }; // Assume 15-minute slot
        }
    }
    
    return null;
}

function addCurrentTimeIndicator(row) {
    // Remove existing indicator
    const existingIndicator = row.querySelector('.current-time-indicator');
    if (existingIndicator) existingIndicator.remove();
    
    // Add new indicator
    const indicator = document.createElement('div');
    indicator.className = 'current-time-indicator';
    indicator.innerHTML = '<i class="fa-solid fa-clock"></i> Current Time';
    
    row.style.position = 'relative';
    row.appendChild(indicator);
}

function addEditFunctionality() {
    const editModeBtn = document.getElementById('editModeBtn');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const printScheduleBtn = document.getElementById('printScheduleBtn');
    
    if (!editModeBtn) {
        console.error('Edit mode button not found');
        return;
    }
    if (!saveChangesBtn) {
        console.error('Save changes button not found');
        return;
    }
    if (!printScheduleBtn) {
        console.error('Print schedule button not found');
        return;
    }
    
    let isEditMode = false;
    
    console.log('Setting up edit functionality...');
    
    // Edit Mode Toggle
    editModeBtn.addEventListener('click', function() {
        console.log('Edit mode button clicked, current mode:', isEditMode);
        isEditMode = !isEditMode;
        toggleEditMode(isEditMode);
        
        if (isEditMode) {
            this.innerHTML = '<i class="fa-solid fa-times"></i> Exit Edit Mode';
            this.classList.remove('btn-secondary');
            this.classList.add('btn-danger');
            saveChangesBtn.style.display = 'flex';
            console.log('Entered edit mode');
        } else {
            this.innerHTML = '<i class="fa-regular fa-edit"></i> Edit Mode';
            this.classList.remove('btn-danger');
            this.classList.add('btn-secondary');
            saveChangesBtn.style.display = 'none';
            
            // Revert any unsaved changes
            revertUnsavedChanges();
            console.log('Exited edit mode');
        }
    });
    
    // Save Changes
    saveChangesBtn.addEventListener('click', async function(event) {
        event.preventDefault();
        console.log('Save changes button clicked');
        
        // Disable button to prevent double-clicks
        this.disabled = true;
        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        
        try {
            console.log('Changes saved locally...');
            
            isEditMode = false;
            editModeBtn.innerHTML = '<i class="fa-regular fa-edit"></i> Edit Mode';
            editModeBtn.classList.remove('btn-danger');
            editModeBtn.classList.add('btn-secondary');
            this.style.display = 'none';
            toggleEditMode(false);
            
            // Update original text after successful save
            updateOriginalText();
            
            console.log('Save completed successfully');
        } catch (error) {
            console.error('Error saving activities:', error);
            const msg = (error && error.message) ? error.message : 'Error saving activities to database';
            showNotification(msg, 'error');
        } finally {
            // Re-enable button
            this.disabled = false;
            this.innerHTML = '<i class="fa-solid fa-save"></i> Save Changes';
        }
    });
    
    // Print Schedule
    printScheduleBtn.addEventListener('click', function() {
        console.log('Print schedule button clicked');
        window.print();
    });
    
    // Add merge controls (for debugging and manual control)
    addMergeControls();
    
    console.log('Edit functionality setup completed');
}

function toggleEditMode(enabled) {
    const scheduleTable = document.getElementById('scheduleTable');
    const activityCells = document.querySelectorAll('.activity-cell');
    
    console.log(`Toggle edit mode: ${enabled}, found ${activityCells.length} activity cells`);
    
    if (enabled) {
        scheduleTable.classList.add('edit-mode');
        let editableCells = 0;
        
        activityCells.forEach((cell, index) => {
            // Only make non-empty and visible cells editable
            if (!cell.classList.contains('empty-cell') && !cell.classList.contains('hidden-by-merge')) {
                cell.contentEditable = 'true';
                cell.style.cursor = 'text';
                cell.title = 'Click to edit activity';
                cell.setAttribute('tabindex', '0');
                
                // Store original text if not already stored
                if (!cell.dataset.originalText) {
                    cell.dataset.originalText = cell.textContent.trim();
                }
                
                // Add edit event listeners
                cell.addEventListener('focus', onCellFocus);
                cell.addEventListener('blur', onCellBlur);
                cell.addEventListener('keydown', onCellKeydown);
                
                editableCells++;
            }
        });
        
        console.log(`Made ${editableCells} cells editable`);
    } else {
        scheduleTable.classList.remove('edit-mode');
        
        activityCells.forEach(cell => {
            if (!cell.classList.contains('hidden-by-merge')) {
            cell.contentEditable = 'false';
            cell.style.cursor = 'default';
            cell.title = '';
            cell.removeAttribute('tabindex');
            
            // Remove edit event listeners
            cell.removeEventListener('focus', onCellFocus);
            cell.removeEventListener('blur', onCellBlur);
            cell.removeEventListener('keydown', onCellKeydown);
            }
        });
        
        console.log('Disabled edit mode for all cells');
        
        // Re-apply merged cell styling to ensure hidden cells stay hidden
        applyMergedCellStyling();
    }
}

function onCellFocus(event) {
    const cell = event.target;
    cell.dataset.beforeEdit = cell.textContent;
}

function onCellBlur(event) {
    const cell = event.target;
    const newText = cell.textContent.trim();
    
    console.log('Cell blur event:', {
        originalText: cell.dataset.beforeEdit,
        newText: newText,
        cellElement: cell
    });
    
    if (newText === '') {
        // Don't allow empty cells
        const fallbackText = cell.dataset.beforeEdit || cell.dataset.originalText || 'Empty Activity';
        cell.textContent = fallbackText;
        console.log('Restored empty cell to:', fallbackText);
    } else if (newText !== cell.dataset.beforeEdit) {
        // Text has changed
        cell.dataset.activity = newText;
        console.log('Activity updated to:', newText);
        
        // Check if this is a merged cell
        const isRowMerged = cell.hasAttribute('rowspan') && parseInt(cell.getAttribute('rowspan')) > 1;
        
        // Update any merged cells
        if (cell.colSpan > 1) {
            updateMergedCells(cell, newText);
        }
        
        // If this is a merged cell, update all related hidden cells
        if (isRowMerged) {
            const rowspan = parseInt(cell.getAttribute('rowspan'));
            const currentRow = cell.closest('tr');
            const allRows = Array.from(document.querySelectorAll('tbody tr'));
            const currentRowIndex = allRows.indexOf(currentRow);
            
            // Find all rows that this merged cell spans
            for (let i = 1; i < rowspan; i++) {
                const rowIndex = currentRowIndex + i;
                if (rowIndex < allRows.length) {
                    const hiddenCells = allRows[rowIndex].querySelectorAll('.hidden-by-merge');
                    hiddenCells.forEach(hiddenCell => {
                        hiddenCell.dataset.activity = newText;
                        hiddenCell.dataset.originalText = newText;
                    });
                }
            }
        }
        
        // Check if this activity should be merged with adjacent cells
        checkForAutoMerge(cell, newText);
        
        // Update styling based on new activity
        updateActivityStyling(cell);
    }
}

function checkForAutoMerge(changedCell, newText) {
    try {
        console.log('Checking for auto-merge opportunities for:', newText);
        
        // Skip if this cell is already part of a merged group
        if (changedCell.hasAttribute('rowspan') && parseInt(changedCell.getAttribute('rowspan')) > 1) {
            console.log('Cell is already part of a merged group, skipping auto-merge');
            return;
        }
        
        // Find all cells with the same activity text
        const allCells = document.querySelectorAll('.activity-cell:not(.empty-cell):not(.hidden-by-merge)');
        const sameActivityCells = Array.from(allCells).filter(cell => 
            cell.textContent.trim() === newText && cell !== changedCell
        );
        
        if (sameActivityCells.length === 0) {
            console.log('No other cells with same activity found');
            return;
        }
        
        console.log(`Found ${sameActivityCells.length} other cells with same activity:`, sameActivityCells);
        
        // Group cells by their column position
        const cellsByColumn = {};
        [changedCell, ...sameActivityCells].forEach(cell => {
            // Skip cells that are already part of a merged group
            if (cell.hasAttribute('rowspan') && parseInt(cell.getAttribute('rowspan')) > 1) {
                return;
            }
            
            const row = cell.closest('tr');
            const timeCell = row.querySelector('.time-cell');
            const timeText = timeCell ? timeCell.textContent.trim() : '';
            
            // Find column index
            const rowCells = Array.from(row.querySelectorAll('.activity-cell:not(.hidden-by-merge)'));
            const columnIndex = rowCells.indexOf(cell);
            
            if (columnIndex !== -1) {
                if (!cellsByColumn[columnIndex]) {
                    cellsByColumn[columnIndex] = [];
                }
                cellsByColumn[columnIndex].push({
                    cell: cell,
                    time: timeText,
                    row: row
                });
            }
        });
        
        // Check each column for merge opportunities
        Object.keys(cellsByColumn).forEach(columnIndex => {
            const cellsInColumn = cellsByColumn[columnIndex];
            if (cellsInColumn.length > 1) {
                // Sort by time
                cellsInColumn.sort((a, b) => {
                    return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
                });
                
                // Check if cells are consecutive
                const consecutiveCells = findConsecutiveCells(cellsInColumn);
                if (consecutiveCells.length > 1) {
                    console.log(`Found ${consecutiveCells.length} consecutive cells to merge in column ${columnIndex}`);
                    mergeConsecutiveCells(consecutiveCells, newText);
                }
            }
        });
        
    } catch (error) {
        console.error('Error in auto-merge check:', error);
    }
}

function findConsecutiveCells(cellsInColumn) {
    const consecutive = [];
    let currentGroup = [cellsInColumn[0]];
    
    for (let i = 1; i < cellsInColumn.length; i++) {
        const currentTime = parseTimeToMinutes(cellsInColumn[i].time);
        const previousTime = parseTimeToMinutes(cellsInColumn[i-1].time);
        
        // Check if this cell is consecutive (within 30 minutes)
        if (currentTime - previousTime <= 30) {
            currentGroup.push(cellsInColumn[i]);
        } else {
            if (currentGroup.length > 1) {
                consecutive.push(...currentGroup);
            }
            currentGroup = [cellsInColumn[i]];
        }
    }
    
    if (currentGroup.length > 1) {
        consecutive.push(...currentGroup);
    }
    
    return consecutive;
}

function mergeConsecutiveCells(cells, activityText) {
    try {
        console.log('Merging consecutive cells:', cells);
        
        // Sort cells by time
        cells.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
        
        // Use the first cell as the merged cell
        const firstCell = cells[0].cell;
        const rowspan = cells.length;
        
        // Update the first cell
        firstCell.textContent = activityText;
        firstCell.dataset.activity = activityText;
        firstCell.dataset.originalText = activityText;
        firstCell.setAttribute('rowspan', rowspan);
        firstCell.classList.add('merged-activity');
        
        // Hide the other cells
        for (let i = 1; i < cells.length; i++) {
            const cell = cells[i].cell;
            cell.classList.add('hidden-by-merge');
        }
        
        // Style adjacent cells in the same rows to maintain visual consistency
        cells.forEach(({ row }) => {
            // Mark the entire row as merged
            row.classList.add('merged-row');
            
            // Get all cells in the row, including hidden ones
            const allCells = Array.from(row.querySelectorAll('.activity-cell'));
            
            // Style all cells in the row for consistency
            allCells.forEach((rowCell) => {
                if (rowCell !== firstCell) {
                    if (rowCell.classList.contains('hidden-by-merge')) {
                        // Hidden cells should remain hidden
                    } else {
                        // Visible cells that aren't the merged cell should be styled
                        rowCell.classList.add('adjacent-to-merge');
                    }
                }
            });
        });
        
        // Add a special class to the table to ensure proper layout
        const scheduleTable = document.getElementById('scheduleTable');
        if (scheduleTable) {
            scheduleTable.classList.add('has-merged-cells');
        }
        
        // Update styling
        updateActivityStyling(firstCell);
        
        console.log(`Successfully merged ${rowspan} cells for activity: ${activityText}`);
        
    } catch (error) {
        console.error('Error merging consecutive cells:', error);
    }
}

function onCellKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.target.blur();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        event.target.textContent = event.target.dataset.beforeEdit || event.target.dataset.originalText;
        event.target.blur();
    }
}

function revertUnsavedChanges() {
    const activityCells = document.querySelectorAll('.activity-cell:not(.hidden-by-merge)');
    activityCells.forEach(cell => {
        if (!cell.classList.contains('empty-cell') && cell.dataset.originalText) {
            cell.textContent = cell.dataset.originalText;
            cell.dataset.activity = cell.dataset.originalText;
        }
    });
    
    // Re-apply merged cell styling to ensure hidden cells stay hidden
    applyMergedCellStyling();
}

function updateOriginalText() {
    const activityCells = document.querySelectorAll('.activity-cell');
    activityCells.forEach(cell => {
        if (!cell.classList.contains('empty-cell')) {
            cell.dataset.originalText = cell.textContent;
        }
    });
}

function updateMergedCells(cell, newText) {
    // Find all cells in the same row with the same colspan
    const row = cell.closest('tr');
    const cells = row.querySelectorAll('.activity-cell');
    
    cells.forEach(c => {
        if (c.colSpan === cell.colSpan && c !== cell) {
            c.textContent = newText;
            c.dataset.activity = newText;
        }
    });
}

function unmergeCell(cell) {
    try {
        console.log('Unmerging cell:', cell);
        
        if (!cell.classList.contains('merged-activity')) {
            console.log('Cell is not merged, nothing to unmerge');
            return;
        }
        
        const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
        if (rowspan <= 1) {
            console.log('Cell has no rowspan, nothing to unmerge');
            return;
        }
        
        const activityText = cell.textContent.trim();
        const currentRow = cell.closest('tr');
        const timeCell = currentRow.querySelector('.time-cell');
        const currentTime = timeCell ? timeCell.textContent.trim() : '';
        
        // Find all time cells to get the sequence
        const allTimeCells = document.querySelectorAll('.time-cell');
        let currentTimeIndex = -1;
        
        allTimeCells.forEach((tc, index) => {
            if (tc.textContent.trim() === currentTime) {
                currentTimeIndex = index;
            }
        });
        
        if (currentTimeIndex === -1) {
            console.error('Could not find current time index');
            return;
        }
        
        // Remove merge attributes from the current cell
        cell.removeAttribute('rowspan');
        cell.classList.remove('merged-activity');
        
        // Show and populate the hidden cells
        for (let i = 1; i < rowspan; i++) {
            const timeCellIndex = currentTimeIndex + i;
            if (timeCellIndex < allTimeCells.length) {
                const targetTimeCell = allTimeCells[timeCellIndex];
                const targetRow = targetTimeCell.closest('tr');
                const hiddenCell = targetRow.querySelector('.activity-cell.hidden-by-merge');
                
                if (hiddenCell) {
                    hiddenCell.style.display = '';
                    hiddenCell.classList.remove('hidden-by-merge');
                    hiddenCell.textContent = activityText;
                    hiddenCell.dataset.activity = activityText;
                    hiddenCell.dataset.originalText = activityText;
                    updateActivityStyling(hiddenCell);
                }
            }
        }
        
        console.log(`Successfully unmerged cell spanning ${rowspan} rows`);
        
    } catch (error) {
        console.error('Error unmerging cell:', error);
    }
}

function resetAllMerges() {
    console.log('Resetting all merged cells');
    
    const mergedCells = document.querySelectorAll('.merged-activity');
    mergedCells.forEach(cell => {
        unmergeCell(cell);
    });
    
    const hiddenCells = document.querySelectorAll('.hidden-by-merge');
    hiddenCells.forEach(cell => {
        cell.style.display = '';
        cell.classList.remove('hidden-by-merge');
    });
    
    // Clean up styling classes
    const adjacentCells = document.querySelectorAll('.adjacent-to-merge');
    adjacentCells.forEach(cell => {
        cell.classList.remove('adjacent-to-merge');
    });
    
    const mergedRows = document.querySelectorAll('.merged-row');
    mergedRows.forEach(row => {
        row.classList.remove('merged-row');
    });
    
    console.log('All merges reset');
}

function addMergeControls() {
    // Add merge control buttons to the toolbar
    const toolbarRight = document.querySelector('.toolbar-right .btn-group');
    if (!toolbarRight) return;
    
    // Create merge controls container
    const mergeControls = document.createElement('div');
    mergeControls.className = 'merge-controls';
    mergeControls.style.cssText = `
        display: flex;
        gap: 0.5rem;
        margin-left: 1rem;
        align-items: center;
    `;
    
    // Auto-merge button
    const autoMergeBtn = document.createElement('button');
    autoMergeBtn.className = 'btn btn-outline btn-sm';
    autoMergeBtn.innerHTML = '<i class="fa-solid fa-object-group"></i> Auto-Merge';
    autoMergeBtn.title = 'Automatically merge cells with same activities';
    autoMergeBtn.addEventListener('click', function() {
        console.log('Auto-merge button clicked');
        performAutoMerge();
    });
    
    // Reset merges button
    const resetMergesBtn = document.createElement('button');
    resetMergesBtn.className = 'btn btn-outline btn-sm';
    resetMergesBtn.innerHTML = '<i class="fa-solid fa-undo"></i> Reset Merges';
    resetMergesBtn.title = 'Reset all merged cells';
    resetMergesBtn.addEventListener('click', function() {
        console.log('Reset merges button clicked');
        resetAllMerges();
        showNotification('All merges reset', 'info');
    });
    
    // Merge status indicator
    const mergeStatus = document.createElement('span');
    mergeStatus.className = 'merge-status';
    mergeStatus.style.cssText = `
        font-size: 0.8rem;
        color: #666;
        margin-left: 0.5rem;
    `;
    
    mergeControls.appendChild(autoMergeBtn);
    mergeControls.appendChild(resetMergesBtn);
    mergeControls.appendChild(mergeStatus);
    
    toolbarRight.appendChild(mergeControls);
    
    // Update merge status periodically
    setInterval(updateMergeStatus, 2000);
    
    function updateMergeStatus() {
        const mergedCells = document.querySelectorAll('.merged-activity');
        const hiddenCells = document.querySelectorAll('.hidden-by-merge');
        
        if (mergedCells.length > 0) {
            mergeStatus.textContent = `${mergedCells.length} merged, ${hiddenCells.length} hidden`;
            mergeStatus.style.color = '#4caf50';
        } else {
            mergeStatus.textContent = 'No merges';
            mergeStatus.style.color = '#666';
        }
    }
}

function performAutoMerge() {
    console.log('Performing auto-merge on all activities');
    
    // Group all activities by text
    const allCells = document.querySelectorAll('.activity-cell:not(.empty-cell):not(.hidden-by-merge)');
    const activityGroups = {};
    
    allCells.forEach(cell => {
        const activityText = cell.textContent.trim();
        if (activityText && !cell.classList.contains('merged-activity')) {
            if (!activityGroups[activityText]) {
                activityGroups[activityText] = [];
            }
            activityGroups[activityText].push(cell);
        }
    });
    
    let mergeCount = 0;
    
    // Process each activity group
    Object.keys(activityGroups).forEach(activityText => {
        const cells = activityGroups[activityText];
        if (cells.length > 1) {
            // Group by column
            const cellsByColumn = {};
            cells.forEach(cell => {
                const row = cell.closest('tr');
                const rowCells = Array.from(row.querySelectorAll('.activity-cell:not(.hidden-by-merge)'));
                const columnIndex = rowCells.indexOf(cell);
                
                if (columnIndex !== -1) {
                    if (!cellsByColumn[columnIndex]) {
                        cellsByColumn[columnIndex] = [];
                    }
                    cellsByColumn[columnIndex].push({
                        cell: cell,
                        time: row.querySelector('.time-cell').textContent.trim()
                    });
                }
            });
            
            // Check each column for consecutive cells
            Object.keys(cellsByColumn).forEach(columnIndex => {
                const cellsInColumn = cellsByColumn[columnIndex];
                if (cellsInColumn.length > 1) {
                    cellsInColumn.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
                    const consecutiveCells = findConsecutiveCells(cellsInColumn);
                    if (consecutiveCells.length > 1) {
                        mergeConsecutiveCells(consecutiveCells, activityText);
                        mergeCount++;
                    }
                }
            });
        }
    });
    
    if (mergeCount > 0) {
        showNotification(`Auto-merged ${mergeCount} activity groups`, 'success');
    } else {
        showNotification('No merge opportunities found', 'info');
    }
}


function addActivityFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const filterType = this.dataset.filter;
            filterByType(filterType);
        });
    });
}

function filterByType(filterType) {
    const activityCells = document.querySelectorAll('.activity-cell');
    
    activityCells.forEach(cell => {
        const activityText = cell.textContent.toLowerCase();
        let shouldShow = false;
        
        switch(filterType) {
            case 'meals':
                shouldShow = activityText.includes('breakfast') || 
                           activityText.includes('lunch') || 
                           activityText.includes('dinner') ||
                           activityText.includes('snack') ||
                           activityText.includes('food preparation');
                break;
            case 'activities':
                shouldShow = activityText.includes('sports') || 
                           activityText.includes('exercise') || 
                           activityText.includes('gardening') ||
                           activityText.includes('project') ||
                           activityText.includes('recreational') ||
                           activityText.includes('skills training');
                break;
            case 'cleaning':
                shouldShow = activityText.includes('cleaning') || 
                           activityText.includes('washing') || 
                           activityText.includes('general cleaning') ||
                           activityText.includes('dining area');
                break;
            case 'spiritual':
                shouldShow = activityText.includes('prayer') || 
                           activityText.includes('mass') || 
                           activityText.includes('angelus') ||
                           activityText.includes('rosary') ||
                           activityText.includes('flag ceremony');
                break;
            case 'personal':
                shouldShow = activityText.includes('bathing') || 
                           activityText.includes('laundry') || 
                           activityText.includes('hygiene') ||
                           activityText.includes('waking') ||
                           activityText.includes('nap');
                break;
            default:
                shouldShow = true;
        }
        
        if (shouldShow) {
            cell.style.display = '';
            cell.style.opacity = '1';
        } else {
            cell.style.display = 'none';
            cell.style.opacity = '0.3';
        }
    });
}

function highlightActivityTypes() {
    const activityCells = document.querySelectorAll('.activity-cell');
    
    activityCells.forEach(cell => {
        const activityText = cell.textContent;
        
        // Add activity type classes for better styling
        if (activityText.includes('BREAKFAST') || activityText.includes('LUNCH') || activityText.includes('DINNER')) {
            cell.classList.add('meal-activity');
        } else if (activityText.includes('SPORTS') || activityText.includes('EXERCISE')) {
            cell.classList.add('sports-activity');
        } else if (activityText.includes('GARDENING')) {
            cell.classList.add('garden-activity');
        } else if (activityText.includes('PROJECT')) {
            cell.classList.add('project-activity');
        } else if (activityText.includes('CLEANING') || activityText.includes('WASHING')) {
            cell.classList.add('cleaning-activity');
        } else if (activityText.includes('PRAYER') || activityText.includes('MASS')) {
            cell.classList.add('spiritual-activity');
        }
    });
}

function handleResponsiveBehavior() {
    // Add touch support for mobile
    if ('ontouchstart' in window) {
        const activityCells = document.querySelectorAll('.activity-cell');
        activityCells.forEach(cell => {
            cell.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.98)';
            });
            
            cell.addEventListener('touchend', function() {
                this.style.transform = 'scale(1)';
            });
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const table = document.querySelector('.daily-schedule-table');
        if (table) {
            if (window.innerWidth < 768) {
                table.style.fontSize = '0.75rem';
            } else if (window.innerWidth < 1200) {
                table.style.fontSize = '0.8rem';
            } else {
                table.style.fontSize = '0.875rem';
            }
        }
    });
}

function showLoadingIndicator() {
    // Create loading indicator
    const loading = document.createElement('div');
    loading.id = 'loadingIndicator';
    loading.innerHTML = `
        <div class="loading-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Saving to database...</span>
        </div>
    `;
    
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    document.body.appendChild(loading);
}

function hideLoadingIndicator() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) {
        loading.remove();
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fa-solid fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--info)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications and loading
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .btn-danger {
        background: var(--danger);
        color: var(--text-light);
    }
    
    .btn-danger:hover {
        background: #c0392b;
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
    }
    
    .loading-spinner {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    .loading-spinner i {
        font-size: 2rem;
        color: var(--primary-color);
    }
    
    .loading-spinner span {
        color: var(--text-dark);
        font-weight: 500;
    }
    
    .activity-cell[contenteditable="true"] {
        border: 2px dashed var(--primary-color);
        padding: 4px;
        min-height: 24px;
        transition: all 0.2s ease;
    }
    
    .activity-cell[contenteditable="true"]:hover {
        background-color: var(--primary-light);
    }
    
    .activity-cell[contenteditable="true"]:focus {
        outline: none;
        border: 2px solid var(--primary-color);
        background-color: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
`;
document.head.appendChild(style);