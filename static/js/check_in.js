$(document).ready(function() {
    // Handle search
    const searchInput = $('.search-container input');
    searchInput.on('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const checkInItems = $('.check-in-item');
        
        checkInItems.each(function() {
            const clientName = $(this).find('h4').text().toLowerCase();
            const status = $(this).find('.status').text().toLowerCase();
            const date = $(this).find('.date').text().toLowerCase();
            
            if (clientName.includes(searchTerm) || 
                status.includes(searchTerm) || 
                date.includes(searchTerm)) {
                $(this).css('display', '');
            } else {
                $(this).css('display', 'none');
            }
        });
    });

    // Handle filter buttons
    const filterButtons = $('.filter-btn');
    filterButtons.on('click', function() {
        // Remove active class from all buttons
        filterButtons.removeClass('active');
        // Add active class to clicked button
        $(this).addClass('active');
        
        const filter = $(this).data('filter');
        const checkInItems = $('.check-in-item');
        
        checkInItems.each(function() {
            if (filter === 'all') {
                $(this).css('display', '');
            } else {
                const status = $(this).find('.status').text().toLowerCase();
                $(this).css('display', status === filter ? '' : 'none');
            }
        });
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
        // Show add check-in modal
        const modal = $('#addCheckInModal');
        if (modal) {
            modal.css('display', 'flex');
        }
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
            // Handle form submission
            console.log('Adding new check-in');
            // Close modal
            const modal = $('#addCheckInModal');
            if (modal) {
                modal.css('display', 'none');
            }
        });
    }

    // View Toggle Functionality
    $('.view-btn').on('click', function() {
        const $this = $(this);
        const viewType = $this.data('view');
        
        // Update buttons
        $('.view-btn').removeClass('active');
        $this.addClass('active');
        
        // Update views
        $('.checkin-view').hide();
        $(`.${viewType}-view`).fadeIn();
        
        // Update title
        const title = viewType === 'in-house' ? 'In House Check-ins' : 'After Care Check-ins';
        $('.main-header h1').text(title);
        
        // Load data for the selected view
        loadCheckInData(viewType);
    });

    // Calendar Navigation
    const $inHouseMonthElement = $('#checkinCurrentMonth');
    const $afterCareMonthElement = $('#afterCareCurrentMonth');
    let inHouseCurrentDate = new Date();
    let afterCareCurrentDate = new Date();

    // In-house calendar navigation
    $('#checkinPrevMonth').on('click', function() {
        inHouseCurrentDate.setMonth(inHouseCurrentDate.getMonth() - 1);
        updateCalendar('in-house');
    });

    $('#checkinNextMonth').on('click', function() {
        inHouseCurrentDate.setMonth(inHouseCurrentDate.getMonth() + 1);
        updateCalendar('in-house');
    });

    // After-care calendar navigation
    $('#afterCarePrevMonth').on('click', function() {
        afterCareCurrentDate.setMonth(afterCareCurrentDate.getMonth() - 1);
        updateCalendar('after-care');
    });

    $('#afterCareNextMonth').on('click', function() {
        afterCareCurrentDate.setMonth(afterCareCurrentDate.getMonth() + 1);
        updateCalendar('after-care');
    });

    // Initialize calendars
    updateCalendar('in-house');
    updateCalendar('after-care');

    // Load initial data for in-house view
    loadCheckInData('in-house');

    // Functions
    function updateCalendar(viewType) {
        const currentDate = viewType === 'in-house' ? inHouseCurrentDate : afterCareCurrentDate;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];

        const $currentMonthElement = viewType === 'in-house' ? $inHouseMonthElement : $afterCareMonthElement;
        $currentMonthElement.text(`${monthNames[month]} ${year}`);

        const $calendarDays = viewType === 'in-house' ? $('#checkinCalendarDays') : $('#afterCareCalendarDays');
        $calendarDays.empty();

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay.getDay(); i++) {
            $calendarDays.append($('<div>').addClass('calendar-day other-month'));
        }

        // Add days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const $dayElement = $('<div>')
                .addClass('calendar-day')
                .text(day)
                .on('click', function() {
                    $('.calendar-day').removeClass('selected');
                    $(this).addClass('selected');
                    loadDayCheckIns(year, month, day, viewType);
                });

            if (isToday(year, month, day)) {
                $dayElement.addClass('today');
            }

            $calendarDays.append($dayElement);
        }
    }

    function isToday(year, month, day) {
        const today = new Date();
        return today.getFullYear() === year && 
               today.getMonth() === month && 
               today.getDate() === day;
    }

    function loadCheckInData(viewType) {
        console.log('Loading data for:', viewType);
        // Here you would normally fetch data from your backend
        // For now, we'll just update the UI to show the change
        
        // Example data update
        if (viewType === 'in-house') {
            $('.stat-value').first().text('24/30');
            $('.stat-value').eq(1).text('😊 7.5');
            $('.stat-value').last().text('18');
        } else {
            $('.stat-value').first().text('15/20');
            $('.stat-value').eq(1).text('😊 8.2');
            $('.stat-value').last().text('12');
        }
    }

    function updateStats(stats) {
        // Update the statistics in the checkin-stats section
        $('.stat-value').first().text(`${stats.completed}/${stats.total}`);
        $('.stat-value').eq(1).text(`😊 ${stats.averageMood}`);
        $('.stat-value').last().text(stats.interventionsViewed);
    }

    function updateSubmissionsList(submissions) {
        const submissionsList = $('.submissions-list');
        submissionsList.empty();
        submissions.forEach(submission => {
            submissionsList.append(`
                <div class="submission-item">
                    <div class="submission-header">
                        <div class="client-info">
                            <div class="client-avatar">
                                <span class="avatar-initials">${submission.initials}</span>
                            </div>
                            <div class="client-details">
                                <h4>${submission.name}</h4>
                                <div class="submission-meta">
                                    <span class="submission-time">
                                        <i class="fas fa-clock"></i> ${submission.time}
                                    </span>
                                    <span class="client-id">#${submission.clientId}</span>
                                </div>
                            </div>
                        </div>
                        <div class="mood-indicator mood-${submission.moodLevel.toLowerCase()}">
                            <span class="mood-emoji">${submission.moodEmoji}</span>
                            <div class="mood-details">
                                <span class="mood-score">${submission.moodScore}/10</span>
                                <span class="mood-label">${submission.moodLevel}</span>
                            </div>
                        </div>
                    </div>
                    <div class="submission-content">
                        <p class="reflection-text">${submission.reflection}</p>
                        <div class="engagement-metrics">
                            ${submission.viewed ? `
                                <div class="metric-badge viewed">
                                    <i class="fas fa-eye"></i>
                                    <span>Viewed Intervention</span>
                                </div>
                            ` : ''}
                            ${submission.onTime ? `
                                <div class="metric-badge on-time">
                                    <i class="fas fa-check-circle"></i>
                                    <span>On Time</span>
                                </div>
                            ` : ''}
                            ${submission.streak ? `
                                <div class="metric-badge streak">
                                    <i class="fas fa-fire"></i>
                                    <span>${submission.streak} Day Streak</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `);
        });
    }

    function updateCalendarIndicators(calendarData) {
        // Add indicators to calendar days based on check-in status
        $('.calendar-day').each(function() {
            const day = parseInt($(this).text());
            if (day && calendarData[day]) {
                const status = calendarData[day];
                if (status.completed) {
                    $(this).addClass('has-completed');
                }
                if (status.missed) {
                    $(this).addClass('has-missed');
                }
            }
        });
    }

    async function loadDayCheckIns(year, month, day, viewType) {
        try {
            const response = await fetch(`/api/check-ins/${viewType}/${year}/${month + 1}/${day}`);
            const data = await response.json();
            updateSubmissionsList(data.submissions);
        } catch (error) {
            console.error('Error loading day check-ins:', error);
        }
    }

    // Handle mood filter changes
    $('.filter-select').on('change', function() {
        const viewType = $('.view-btn.active').data('view');
        loadCheckInData(viewType);
    });
}); 