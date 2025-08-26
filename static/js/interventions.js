document.addEventListener('DOMContentLoaded', function() {
    // Initialize Intervention Calendar
    function initializeInterventionCalendar() {
        const currentMonthElement = document.getElementById('interventionCurrentMonth');
        const calendarDaysElement = document.getElementById('interventionCalendarDays');
        const prevMonthButton = document.getElementById('interventionPrevMonth');
        const nextMonthButton = document.getElementById('interventionNextMonth');

        if (!currentMonthElement || !calendarDaysElement) return;

        let currentDate = new Date();
        let currentMonth = currentDate.getMonth();
        let currentYear = currentDate.getFullYear();

        // Sample data for interventions
        const interventions = {
            '2024-02-15': { type: 'group', title: 'Group Therapy' },
            '2024-02-20': { type: 'individual', title: 'One-on-One Session' },
            '2024-02-25': { type: 'workshop', title: 'Coping Skills Workshop' },
        };

        function updateCalendar() {
            const firstDay = new Date(currentYear, currentMonth, 1);
            const lastDay = new Date(currentYear, currentMonth + 1, 0);
            const startingDay = firstDay.getDay();
            const monthLength = lastDay.getDate();
            
            // Update month/year display
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                              'July', 'August', 'September', 'October', 'November', 'December'];
            currentMonthElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;

            // Clear previous days
            calendarDaysElement.innerHTML = '';

            // Previous month's days
            const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
            for (let i = startingDay - 1; i >= 0; i--) {
                const dayElement = createDayElement(prevMonthLastDay - i, 'other-month');
                calendarDaysElement.appendChild(dayElement);
            }

            // Current month's days
            const today = new Date();
            for (let i = 1; i <= monthLength; i++) {
                const isToday = today.getDate() === i && 
                               today.getMonth() === currentMonth && 
                               today.getFullYear() === currentYear;
                
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const dayElement = createDayElement(i, isToday ? 'today' : '', interventions[dateStr]);
                
                calendarDaysElement.appendChild(dayElement);
            }

            // Next month's days
            const totalDaysShown = startingDay + monthLength;
            const remainingDays = 42 - totalDaysShown;
            for (let i = 1; i <= remainingDays; i++) {
                const dayElement = createDayElement(i, 'other-month');
                calendarDaysElement.appendChild(dayElement);
            }
        }

        function createDayElement(day, additionalClass, interventionData = null) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('calendar-day');
            if (additionalClass) {
                dayElement.classList.add(additionalClass);
            }
            dayElement.textContent = day;
            
            if (interventionData) {
                dayElement.classList.add(`has-${interventionData.type}`);
                dayElement.setAttribute('data-title', interventionData.title);
                
                // Add click event for modal
                dayElement.addEventListener('click', () => {
                    if (!dayElement.classList.contains('other-month')) {
                        openInterventionModal({
                            date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                            intervention: interventionData
                        });
                    }
                });
            }
            
            return dayElement;
        }

        // Event listeners for month navigation
        prevMonthButton.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            updateCalendar();
        });

        nextMonthButton.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            updateCalendar();
        });

        // Initialize calendar
        updateCalendar();
    }

    // Initialize intervention calendar
    initializeInterventionCalendar();

    // Create Intervention Modal
    const createInterventionModal = document.getElementById('createInterventionModal');
    const createInterventionBtn = document.querySelector('.btn-primary');
    const closeModalBtn = createInterventionModal.querySelector('.modal-close');

    createInterventionBtn.addEventListener('click', () => {
        createInterventionModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    closeModalBtn.addEventListener('click', () => {
        createInterventionModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    });

    // Handle form submission
    const interventionForm = document.getElementById('interventionForm');
    interventionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Handle form submission here
        console.log('Form submitted');
            createInterventionModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    });

    // Intervention Library Search
    const searchInput = document.querySelector('.intervention-search input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const items = document.querySelectorAll('.intervention-item');
            
            items.forEach(item => {
                const title = item.querySelector('h4').textContent.toLowerCase();
                const description = item.querySelector('p').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    // Category Filter Buttons
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            
            // Update button states
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter interventions
            const items = document.querySelectorAll('.intervention-item');
        items.forEach(item => {
                if (category === 'all' || item.getAttribute('data-category') === category) {
                    item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
        });
    });

    // Assign Intervention Buttons
    const assignButtons = document.querySelectorAll('.assign-btn');
    assignButtons.forEach(button => {
        button.addEventListener('click', function() {
            const interventionId = this.getAttribute('data-id');
            // Handle assignment here
            console.log('Assigning intervention:', interventionId);
        });
    });
}); 