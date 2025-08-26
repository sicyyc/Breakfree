document.addEventListener('DOMContentLoaded', function() {
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    return;
  }

  // Helper function to safely initialize charts
  function initializeChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas with id ${canvasId} not found`);
      return null;
    }
    try {
      // Set a fixed height for the canvas container
      const container = canvas.parentElement;
      container.style.height = '300px'; // Match the CSS height
      
      const ctx = canvas.getContext('2d');
      return new Chart(ctx, config);
    } catch (error) {
      console.error(`Error initializing chart ${canvasId}:`, error);
      return null;
    }
  }

  // Common chart options
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.2, // Wider aspect ratio
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: {
            size: 11
          }
        }
      }
    },
    layout: {
      padding: {
        top: 5,
        right: 10,
        bottom: 20, // More space for x-axis labels
        left: 10
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 11
          },
          maxTicksLimit: 8 // Increased number of y-axis ticks
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)' // Lighter grid lines
        }
      }
    }
  };

  // Initialize Monthly Summary Chart
  const monthlySummaryChart = initializeChart('monthlySummaryChart', {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Active Clients',
        data: [65, 59, 80, 81, 56, 55],
        backgroundColor: '#4682A9'
      }, {
        label: 'Completed Interventions',
        data: [28, 48, 40, 19, 86, 27],
        backgroundColor: '#91C8E4'
      }]
    },
    options: {
      ...commonOptions,
    }
  });

  // Initialize Client Progress Chart
  const clientProgressChart = initializeChart('clientProgressChart', {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        label: 'Mood Score',
        data: [5, 6, 7, 8],
        borderColor: '#4682A9',
        tension: 0.4
      }, {
        label: 'Participation',
        data: [4, 5, 6, 7],
        borderColor: '#91C8E4',
        tension: 0.4
      }]
    },
    options: {
      ...commonOptions,
    }
  });

  // Initialize Relapse Trends Chart
  const relapseTrendsChart = initializeChart('relapseTrendsChart', {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Relapse Rate',
        data: [12, 19, 15, 17, 14, 15],
        borderColor: '#4682A9',
        tension: 0.4
      }]
    },
    options: {
      ...commonOptions,
    }
  });

  // Initialize Intervention Success Chart
  const interventionSuccessChart = initializeChart('interventionSuccessChart', {
    type: 'doughnut',
    data: {
      labels: ['Successful', 'Partial', 'Needs Review'],
      datasets: [{
        data: [70, 20, 10],
        backgroundColor: [
          '#4682A9',
          '#91C8E4',
          '#e0e0e0'
        ]
      }]
    },
    options: {
      ...commonOptions,
    }
  });

  // Create and show toast notification
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    // Add visible class after a small delay for animation
    setTimeout(() => toast.classList.add('visible'), 10);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Handle Report Generation
  document.addEventListener('click', function(e) {
    const generateButton = e.target.closest('.report-actions .btn-primary');
    if (!generateButton) return;

    const reportCard = generateButton.closest('.report-card');
    if (!reportCard) return;

    const reportTitle = reportCard.querySelector('.report-info h3')?.textContent;
    if (!reportTitle) return;

    // Get selected format
    const selectedFormat = reportCard.querySelector('.format-btn.active')?.textContent.trim() || 'PDF';
    
    // Show loading state
    generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    generateButton.disabled = true;

    // Simulate report generation (replace with actual API call)
    setTimeout(() => {
      try {
        generateButton.innerHTML = '<i class="fas fa-download"></i> Generate Report';
        generateButton.disabled = false;
        showToast(`${reportTitle} has been generated successfully in ${selectedFormat} format!`);
      } catch (error) {
        console.error('Error generating report:', error);
        generateButton.innerHTML = '<i class="fas fa-download"></i> Generate Report';
        generateButton.disabled = false;
        showToast('Failed to generate report. Please try again.', 'error');
      }
    }, 2000);
  });

  // Handle Format Selection
  document.addEventListener('click', function(e) {
    const formatButton = e.target.closest('.format-btn');
    if (!formatButton) return;

    const reportCard = formatButton.closest('.report-card');
    if (!reportCard) return;

    reportCard.querySelectorAll('.format-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    formatButton.classList.add('active');
  });

  // Handle Date Range Selection
  const dateRangeBtn = document.querySelector('.date-range-picker .btn-secondary');
  if (dateRangeBtn) {
    dateRangeBtn.addEventListener('click', function() {
      // Implement date range picker functionality
      console.log('Date range picker clicked');
    });
  }

  // Update chart data when selectors change
  function updateChartData(chartInstance, newData) {
    if (!chartInstance) return;
    
    try {
      chartInstance.data.datasets[0].data = newData;
      chartInstance.update();
    } catch (error) {
      console.error('Error updating chart:', error);
      showToast('Failed to update chart data', 'error');
    }
  }

  // Handle Client Selection
  const clientSelector = document.querySelector('.client-selector select');
  if (clientSelector) {
    clientSelector.addEventListener('change', function() {
      const selectedClient = this.value;
      if (!selectedClient) return;

      // Simulate API call to get client data
      const mockData = {
        moodScores: [6, 7, 8, 9],
        engagementRates: [70, 75, 85, 90]
      };

      if (clientProgressChart) {
        clientProgressChart.data.datasets[0].data = mockData.moodScores;
        clientProgressChart.data.datasets[1].data = mockData.engagementRates;
        clientProgressChart.update();
      }
    });
  }

  // Handle Area Selection
  const areaSelector = document.querySelector('.area-selector select');
  if (areaSelector) {
    areaSelector.addEventListener('change', function() {
      const selectedArea = this.value;
      if (!selectedArea) return;

      // Simulate API call to get area data
      const mockData = selectedArea === 'north' ? [15, 12, 5, 8] : [12, 19, 3, 5];
      if (relapseTrendsChart) {
        updateChartData(relapseTrendsChart, mockData);
      }
    });
  }

  // Handle Intervention Type Selection
  const interventionSelector = document.querySelector('.intervention-filters select');
  if (interventionSelector) {
    interventionSelector.addEventListener('change', function() {
      const selectedType = this.value;
      if (!selectedType) return;

      // Simulate API call to get intervention data
      const mockData = selectedType === 'counseling' ? [90, 80, 85, 75, 70] : [85, 75, 90, 80, 70];
      if (interventionSuccessChart) {
        updateChartData(interventionSuccessChart, mockData);
      }
    });
  }

  // Export Functions
  function exportToPDF(reportId) {
    const reportElement = document.getElementById(reportId);
    if (!reportElement) return;

    // Implement PDF export
    console.log('Exporting to PDF:', reportId);
  }

  function exportToExcel(reportId) {
    const reportElement = document.getElementById(reportId);
    if (!reportElement) return;

    // Implement Excel export
    console.log('Exporting to Excel:', reportId);
  }

  function exportToCSV(reportId) {
    const reportElement = document.getElementById(reportId);
    if (!reportElement) return;

    // Implement CSV export
    console.log('Exporting to CSV:', reportId);
  }

  // Add export event listeners
  document.querySelectorAll('.export-btn').forEach(button => {
    button.addEventListener('click', function() {
      const format = this.getAttribute('data-format');
      const reportId = this.closest('.report-card').id;

      switch(format) {
        case 'pdf':
          exportToPDF(reportId);
          break;
        case 'excel':
          exportToExcel(reportId);
          break;
        case 'csv':
          exportToCSV(reportId);
          break;
      }
    });
  });
}); 