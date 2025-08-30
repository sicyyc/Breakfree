$(document).ready(function() {
    // View toggle functionality
    $('.view-btn').on('click', function() {
        $('.view-btn').removeClass('active');
        $(this).addClass('active');
        
        const view = $(this).data('view');
        console.log('Switched to view:', view);
        
        // You can add different functionality for different views here
        if (view === 'interventions') {
            // Show intervention-specific features
            console.log('Showing intervention view');
        } else {
            // Show activities view
            console.log('Showing activities view');
        }
    });

    // Search functionality for future use
    const searchInput = $('.search-container input');
    if (searchInput.length > 0) {
        searchInput.on('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            // Add search functionality here when needed
        });
    }

    // Filter functionality for future use
    const filterButtons = $('.filter-btn');
    filterButtons.on('click', function() {
        filterButtons.removeClass('active');
        $(this).addClass('active');
        
        const filter = $(this).data('filter');
        console.log('Applied filter:', filter);
    });

    // Handle action buttons
    const actionButtons = $('.action-btn');
    actionButtons.on('click', function() {
        const action = $(this).data('action');
        const clientId = $(this).closest('.check-in-item').data('client-id');
        
        switch(action) {
            case 'view':
                console.log(`Viewing check-in details for client ${clientId}`);
                break;
            case 'edit':
                console.log(`Editing check-in for client ${clientId}`);
                break;
            case 'delete':
                if (confirm('Are you sure you want to delete this check-in?')) {
                    console.log(`Deleting check-in for client ${clientId}`);
                }
                break;
        }
    });

    // Handle add check-in button
    const addCheckInBtn = $('.btn-primary');
    addCheckInBtn.on('click', function() {
        console.log('Add check-in button clicked');
        // Show add check-in modal if needed
    });

    // Handle modal close buttons
    const closeButtons = $('.close-modal');
    closeButtons.on('click', function() {
        const modal = $(this).closest('.modal');
        if (modal) {
            modal.css('display', 'none');
        }
    });

    // Handle form submission
    const addCheckInForm = $('#addCheckInForm');
    if (addCheckInForm) {
        addCheckInForm.on('submit', function(e) {
            e.preventDefault();
            console.log('Adding new check-in');
            // Handle form submission
        });
    }

    // Enhanced Calendar Functionality
    let currentDate = new Date();
    let selectedDate = null;

    // Initialize calendar
    function initializeCalendar() {
        updateCalendar();
        setupCalendarNavigation();
        setupCalendarAccessibility();
    }

    // Update calendar display
    function updateCalendar() {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        
        // Update month/year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
        $('#currentMonth').text(`${monthNames[month]} ${year}`);
        
        // Generate calendar days
        generateCalendarDays(month, year);
        
        // Add visual indicators for events
        addEventIndicators();
    }

    // Generate calendar days - FIXED VERSION
    function generateCalendarDays(month, year) {
        const calendarDays = $('#calendarDays');
        calendarDays.empty();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const monthLength = lastDay.getDate();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculate the total number of days to display (6 weeks × 7 days = 42)
        const totalDaysToShow = 42;
        
        // Calculate the start date (first day of the first week to display)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startingDay);
        
        for (let i = 0; i < totalDaysToShow; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = $('<div>')
                .addClass('calendar-day')
                .attr('data-date', date.toISOString().split('T')[0])
                .attr('tabindex', '0')
                .attr('role', 'button')
                .attr('aria-label', `Select ${date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}`);
            
            const dayNumber = $('<span>')
                .addClass('day-number')
                .text(date.getDate());
            
            dayElement.append(dayNumber);
            
            // Add appropriate classes
            if (date.getMonth() !== month) {
                dayElement.addClass('other-month');
            }
            
            if (date.getTime() === today.getTime()) {
                dayElement.addClass('today');
                dayElement.attr('aria-current', 'date');
            }
            
            // Add click event with enhanced feedback
            dayElement.on('click', function() {
                selectDate(date, $(this));
            });
            
            // Add keyboard navigation
            dayElement.on('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectDate(date, $(this));
                }
            });
            
            // Add hover effects
            dayElement.on('mouseenter', function() {
                $(this).addClass('hover');
            }).on('mouseleave', function() {
                $(this).removeClass('hover');
            });
            
            calendarDays.append(dayElement);
        }
    }

    // Select a date with enhanced feedback
    function selectDate(date, element) {
        // Remove previous selection
        $('.calendar-day').removeClass('selected');
        
        // Add selection to current element
        element.addClass('selected');
        selectedDate = date;
        
        // Add visual feedback
        element.addClass('selected-animation');
        setTimeout(() => {
            element.removeClass('selected-animation');
        }, 300);
        
        // Show activity modal
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        showActivityModal(dayOfWeek);
        
        // Announce selection to screen readers
        const announcement = `Selected ${date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}`;
        announceToScreenReader(announcement);
    }

    // Add event indicators to calendar
    function addEventIndicators() {
        // Sample event data - replace with actual data from your backend
        const events = {
            '2024-02-15': ['activity'],
            '2024-02-20': ['intervention'],
            '2024-02-25': ['activity', 'intervention'],
        };
        
        $('.calendar-day').each(function() {
            const dateStr = $(this).attr('data-date');
            if (events[dateStr]) {
                events[dateStr].forEach(eventType => {
                    $(this).addClass(`has-${eventType}`);
                    
                    // Add indicator dot
                    const indicator = $('<div>')
                        .addClass(`day-indicator ${eventType}`)
                        .attr('aria-label', `${eventType} scheduled`);
                    $(this).append(indicator);
                });
            }
        });
    }

    // Setup calendar navigation
    function setupCalendarNavigation() {
        $('#prevMonth').on('click', function() {
            currentDate.setMonth(currentDate.getMonth() - 1);
            updateCalendar();
            announceToScreenReader(`Navigated to ${currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            })}`);
        });
        
        $('#nextMonth').on('click', function() {
            currentDate.setMonth(currentDate.getMonth() + 1);
            updateCalendar();
            announceToScreenReader(`Navigated to ${currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            })}`);
        });
    }

    // Setup accessibility features
    function setupCalendarAccessibility() {
        // Add ARIA labels and roles
        $('.calendar-grid').attr('role', 'grid');
        $('.calendar-weekday').attr('role', 'columnheader');
        $('.calendar-day').attr('role', 'gridcell');
        
        // Add keyboard navigation
        $(document).on('keydown', function(e) {
            const focusedDay = $('.calendar-day:focus');
            if (focusedDay.length === 0) return;
            
            let targetDay;
            const currentIndex = focusedDay.index();
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    targetDay = focusedDay.prev('.calendar-day');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    targetDay = focusedDay.next('.calendar-day');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    targetDay = focusedDay.parent().children().eq(currentIndex - 7);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    targetDay = focusedDay.parent().children().eq(currentIndex + 7);
                    break;
                case 'Home':
                    e.preventDefault();
                    targetDay = focusedDay.parent().children().first();
                    break;
                case 'End':
                    e.preventDefault();
                    targetDay = focusedDay.parent().children().last();
                    break;
            }
            
            if (targetDay && targetDay.length > 0) {
                targetDay.focus();
            }
        });
    }

    // Announce to screen readers
    function announceToScreenReader(message) {
        const announcement = $('<div>')
            .attr('aria-live', 'polite')
            .attr('aria-atomic', 'true')
            .addClass('sr-only')
            .text(message);
        
        $('body').append(announcement);
        
        setTimeout(() => {
            announcement.remove();
        }, 1000);
    }

    // Enhanced Activity Modal
    function showActivityModal(dayOfWeek) {
        const modal = $('#activityModal');
        const modalTitle = $('#modalTitle');
        const modalDate = $('#modalDate');
        
        modalTitle.text(`${dayOfWeek} Activities`);
        modalDate.text(selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }));
        
        updateScheduleTable(dayOfWeek);
        
        // Enhanced modal display with animation
        modal.fadeIn(300).css('display', 'flex');
        $('body').css('overflow', 'hidden');
        
        // Focus management
        setTimeout(() => {
            $('#closeActivity').focus();
        }, 350);
    }

    // Update schedule table with enhanced data
    function updateScheduleTable(dayOfWeek) {
        const scheduleBody = $('#scheduleBody');
        scheduleBody.empty();
        
        // Sample schedule data - replace with actual data
        const schedule = getScheduleForDay(dayOfWeek);
        
        let totalActivities = 0;
        let interventionCount = 0;
        let mealCount = 0;
        
        schedule.forEach(item => {
            const row = $('<tr>');
            
            const timeCell = $('<td>')
                .addClass('time-slot')
                .text(item.time);
            
            const activityCell = $('<td>')
                .addClass(`${item.type}-cell`)
                .text(item.activity);
            
            row.append(timeCell, activityCell);
            scheduleBody.append(row);
            
            // Count activities
            totalActivities++;
            if (item.type === 'intervention') interventionCount++;
            if (item.type === 'meal') mealCount++;
        });
        
        // Update summary
        $('#totalActivities').text(totalActivities);
        $('#interventionCount').text(interventionCount);
        $('#mealCount').text(mealCount);
    }

    // Get schedule for specific day
    function getScheduleForDay(dayOfWeek) {
        // Sample data - replace with actual backend data
        const schedules = {
            'Monday': [
                { time: '8:00 AM', activity: 'Morning Check-in', type: 'activity' },
                { time: '10:00 AM', activity: 'Group Therapy', type: 'intervention' },
                { time: '12:00 PM', activity: 'Lunch', type: 'meal' },
                { time: '2:00 PM', activity: 'Individual Session', type: 'intervention' },
                { time: '4:00 PM', activity: 'Evening Reflection', type: 'activity' }
            ],
            'Tuesday': [
                { time: '8:00 AM', activity: 'Morning Check-in', type: 'activity' },
                { time: '11:00 AM', activity: 'Medication Review', type: 'intervention' },
                { time: '12:00 PM', activity: 'Lunch', type: 'meal' },
                { time: '3:00 PM', activity: 'Support Group', type: 'activity' }
            ],
            'Wednesday': [
                { time: '8:00 AM', activity: 'Morning Check-in', type: 'activity' },
                { time: '9:30 AM', activity: 'Assessment', type: 'intervention' },
                { time: '12:00 PM', activity: 'Lunch', type: 'meal' },
                { time: '2:30 PM', activity: 'Skills Training', type: 'intervention' }
            ],
            'Thursday': [
                { time: '8:00 AM', activity: 'Morning Check-in', type: 'activity' },
                { time: '10:30 AM', activity: 'Family Meeting', type: 'intervention' },
                { time: '12:00 PM', activity: 'Lunch', type: 'meal' },
                { time: '4:00 PM', activity: 'Progress Review', type: 'activity' }
            ],
            'Friday': [
                { time: '8:00 AM', activity: 'Morning Check-in', type: 'activity' },
                { time: '11:00 AM', activity: 'Weekly Planning', type: 'intervention' },
                { time: '12:00 PM', activity: 'Lunch', type: 'meal' },
                { time: '3:00 PM', activity: 'Weekend Prep', type: 'activity' }
            ],
            'Saturday': [
                { time: '9:00 AM', activity: 'Weekend Check-in', type: 'activity' },
                { time: '12:00 PM', activity: 'Lunch', type: 'meal' },
                { time: '2:00 PM', activity: 'Recreation Time', type: 'activity' }
            ],
            'Sunday': [
                { time: '9:00 AM', activity: 'Weekend Check-in', type: 'activity' },
                { time: '12:00 PM', activity: 'Lunch', type: 'meal' },
                { time: '4:00 PM', activity: 'Week Review', type: 'activity' }
            ]
        };
        
        return schedules[dayOfWeek] || [];
    }

    // Enhanced modal close functionality
    $('#closeActivity').on('click', function() {
        closeActivityModal();
    });

    // Close modal when clicking outside
    $(window).on('click', function(event) {
        const modal = $('#activityModal');
        if (event.target === modal[0]) {
            closeActivityModal();
        }
    });

    // Close modal with escape key
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            closeActivityModal();
        }
    });

    function closeActivityModal() {
        $('#activityModal').fadeOut(300);
        $('body').css('overflow', 'auto');
        
        // Return focus to selected date
        if (selectedDate) {
            const selectedElement = $(`.calendar-day[data-date="${selectedDate.toISOString().split('T')[0]}"]`);
            if (selectedElement.length > 0) {
                setTimeout(() => {
                    selectedElement.focus();
                }, 350);
            }
        }
    }

    // Initialize tooltips and other UI enhancements
    $('[data-toggle="tooltip"]').tooltip();
    
    // Initialize calendar
    initializeCalendar();
    
    // Initialize any other plugins or features
    console.log('Enhanced check-in page initialized successfully');
});

// Add CSS for enhanced animations and accessibility
const enhancedStyles = `
<style>
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.calendar-day.selected-animation {
    animation: selectPulse 0.3s ease-in-out;
}

.calendar-day.hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
}

@keyframes selectPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1.05); }
}

.calendar-day:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.calendar-nav-btn:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

#activityModal {
    display: none;
}

#activityModal.fadeIn {
    animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(-20px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}
</style>
`;

// Inject enhanced styles
$('head').append(enhancedStyles); 