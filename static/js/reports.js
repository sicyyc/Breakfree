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
  let monthlySummaryChart = null;
  
  // Load monthly summary data
  async function loadMonthlySummaryData() {
    try {
      const response = await fetch('/api/reports/monthly-summary');
      const result = await response.json();
      
      if (result.success) {
        monthlySummaryChart = initializeChart('monthlySummaryChart', {
          type: 'bar',
          data: result.data,
          options: {
            ...commonOptions,
          }
        });
      } else {
        console.error('Failed to load monthly summary data:', result.error);
        // Fallback to empty chart
        monthlySummaryChart = initializeChart('monthlySummaryChart', {
          type: 'bar',
          data: {
            labels: [],
            datasets: []
          },
          options: {
            ...commonOptions,
          }
        });
      }
    } catch (error) {
      console.error('Error loading monthly summary data:', error);
    }
  }
  
  // Load the data
  loadMonthlySummaryData();

  // Initialize Client Progress Chart
  let clientProgressChart = null;
  
  // Load client progress data
  async function loadClientProgressData(clientId) {
    if (!clientId) return;
    
    try {
      const response = await fetch(`/api/reports/client-progress/${clientId}`);
      const result = await response.json();
      
      if (result.success) {
        if (clientProgressChart) {
          clientProgressChart.destroy();
        }
        
        clientProgressChart = initializeChart('clientProgressChart', {
          type: 'line',
          data: result.data.chart_data,
          options: {
            ...commonOptions,
          }
        });
        
        // Update metrics display if available
        updateClientMetrics(result.data.metrics);
      } else {
        console.error('Failed to load client progress data:', result.error);
      }
    } catch (error) {
      console.error('Error loading client progress data:', error);
    }
  }
  
  // Update client metrics display
  function updateClientMetrics(metrics) {
    // You can add DOM elements to display these metrics
    console.log('Client metrics:', metrics);
    
    // Show completion status if available
    if (metrics.completion_eligible) {
      console.log('Client is eligible for treatment completion!');
      // You could add a notification or highlight here
    }
  }

  // Initialize Relapse Trends Chart
  let relapseTrendsChart = null;
  
  // Load relapse trends data
  async function loadRelapseTrendsData(areaFilter = 'all') {
    try {
      const response = await fetch(`/api/reports/relapse-trends?area=${areaFilter}`);
      const result = await response.json();
      
      if (result.success) {
        if (relapseTrendsChart) {
          relapseTrendsChart.destroy();
        }
        
        relapseTrendsChart = initializeChart('relapseTrendsChart', {
          type: 'line',
          data: result.data,
          options: {
            ...commonOptions,
          }
        });
      } else {
        console.error('Failed to load relapse trends data:', result.error);
      }
    } catch (error) {
      console.error('Error loading relapse trends data:', error);
    }
  }
  
  // Load the data
  loadRelapseTrendsData();

  // Initialize Intervention Success Chart
  let interventionSuccessChart = null;
  
  // Load intervention success data
  async function loadInterventionSuccessData(interventionType = 'all') {
    try {
      const response = await fetch(`/api/reports/intervention-success?type=${interventionType}`);
      const result = await response.json();
      
      if (result.success) {
        if (interventionSuccessChart) {
          interventionSuccessChart.destroy();
        }
        
        interventionSuccessChart = initializeChart('interventionSuccessChart', {
          type: 'doughnut',
          data: result.data,
          options: {
            ...commonOptions,
          }
        });
      } else {
        console.error('Failed to load intervention success data:', result.error);
      }
    } catch (error) {
      console.error('Error loading intervention success data:', error);
    }
  }
  
  // Load the data
  loadInterventionSuccessData();

  // Initialize Aftercare Summary Chart (for caseworkers)
  let afterCareSummaryChart = null;
  
  // Load aftercare summary data
  async function loadAftercareSummaryData() {
    try {
      const response = await fetch('/api/reports/aftercare-summary');
      const result = await response.json();
      
      if (result.success) {
        if (afterCareSummaryChart) {
          afterCareSummaryChart.destroy();
        }
        
        afterCareSummaryChart = initializeChart('afterCareSummaryChart', {
          type: 'doughnut',
          data: result.data,
          options: {
            ...commonOptions,
          }
        });
      } else {
        console.error('Failed to load aftercare summary data:', result.error);
      }
    } catch (error) {
      console.error('Error loading aftercare summary data:', error);
    }
  }
  
  // Load aftercare data if chart exists
  const aftercareChart = document.getElementById('afterCareSummaryChart');
  if (aftercareChart) {
    loadAftercareSummaryData();
  }

  // Load clients list for client selector
  async function loadClientsList() {
    try {
      const response = await fetch('/api/reports/clients-list');
      const result = await response.json();
      
      if (result.success) {
        const clientSelector = document.querySelector('.client-selector select');
        if (clientSelector) {
          // Clear existing options except the first one
          clientSelector.innerHTML = '<option value="">Select Client</option>';
          
          // Add clients to selector
          result.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.name} (${client.clientId || 'No ID'})`;
            clientSelector.appendChild(option);
          });
        }
      } else {
        console.error('Failed to load clients list:', result.error);
      }
    } catch (error) {
      console.error('Error loading clients list:', error);
    }
  }
  
  // Load clients list
  loadClientsList();

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
    
    // Determine report type based on title
    let reportType = '';
    if (reportTitle.includes('Monthly Summary')) {
      reportType = 'monthly-summary';
    } else if (reportTitle.includes('Client Progress') || reportTitle.includes('After Care Client Progress')) {
      reportType = 'client-progress';
    } else if (reportTitle.includes('Relapse Trends')) {
      reportType = 'relapse-trends';
    } else if (reportTitle.includes('Intervention Success')) {
      reportType = 'intervention-success';
    } else if (reportTitle.includes('After Care Summary')) {
      reportType = 'aftercare-summary';
    }
    
    // Show loading state
    generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    generateButton.disabled = true;

    // Generate and export report
    generateAndExportReport(reportType, selectedFormat.toLowerCase(), reportCard)
      .then(() => {
        generateButton.innerHTML = '<i class="fas fa-download"></i> Generate Report';
        generateButton.disabled = false;
        showToast(`${reportTitle} has been generated successfully in ${selectedFormat} format!`);
      })
      .catch((error) => {
        console.error('Error generating report:', error);
        generateButton.innerHTML = '<i class="fas fa-download"></i> Generate Report';
        generateButton.disabled = false;
        showToast('Failed to generate report. Please try again.', 'error');
      });
  });

  // Generate and export report
  async function generateAndExportReport(reportType, format, reportCard) {
    try {
      // Get current chart data
      let chartData = null;
      let reportData = null;
      
      // Get data based on report type
      switch (reportType) {
        case 'monthly-summary':
          if (monthlySummaryChart) {
            chartData = monthlySummaryChart.data;
            reportData = { data: chartData };
          }
          break;
        case 'client-progress':
          if (clientProgressChart) {
            chartData = clientProgressChart.data;
            reportData = { data: { chart_data: chartData } };
          }
          break;
        case 'relapse-trends':
          if (relapseTrendsChart) {
            chartData = relapseTrendsChart.data;
            reportData = { data: chartData };
          }
          break;
        case 'intervention-success':
          if (interventionSuccessChart) {
            chartData = interventionSuccessChart.data;
            reportData = { data: chartData };
          }
          break;
        case 'aftercare-summary':
          if (afterCareSummaryChart) {
            chartData = afterCareSummaryChart.data;
            reportData = { data: chartData };
          }
          break;
      }
      
      if (!reportData) {
        throw new Error('No data available for export');
      }
      
      // Call export API
      const response = await fetch(`/api/reports/export/${reportType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: format,
          data: reportData
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Handle different export formats
        if (format === 'csv' && result.content) {
          // Download CSV file
          downloadFile(result.content, result.filename || `${reportType}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        } else {
          // For other formats, show message
          console.log('Export result:', result);
        }
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  // Download file helper function
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

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

      // Load client progress data
      loadClientProgressData(selectedClient);
    });
  }

  // Handle Area Selection
  const areaSelector = document.querySelector('.area-selector select');
  if (areaSelector) {
    areaSelector.addEventListener('change', function() {
      const selectedArea = this.value;
      if (!selectedArea) return;

      // Load relapse trends data with area filter
      loadRelapseTrendsData(selectedArea);
    });
  }

  // Handle Intervention Type Selection
  const interventionSelector = document.querySelector('.intervention-filters select');
  if (interventionSelector) {
    interventionSelector.addEventListener('change', function() {
      const selectedType = this.value;
      if (!selectedType) return;

      // Load intervention success data with type filter
      loadInterventionSuccessData(selectedType);
    });
  }

  // Set default format selection
  document.addEventListener('DOMContentLoaded', function() {
    // Set PDF as default format for all report cards
    document.querySelectorAll('.format-btn').forEach(btn => {
      if (btn.textContent.trim() === 'PDF') {
        btn.classList.add('active');
      }
    });
  });
}); 