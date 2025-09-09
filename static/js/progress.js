// Progress Tab JavaScript
// Handles progress visualizations and analytics

let sentimentChart = null;
let domainChart = null;
let currentClientId = null;
let currentPeriod = 'weekly';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Progress JS loaded');
    
    // Get client ID from the page
    currentClientId = getCurrentClientId();
    
    if (!currentClientId) {
        console.error('No client ID found for progress tab');
        return;
    }
    
    // Initialize progress tab
    initializeProgressTab();
});

function getCurrentClientId() {
    // Try to get client ID from URL or data attribute
    const pathParts = window.location.pathname.split('/');
    const clientIndex = pathParts.indexOf('client');
    
    if (clientIndex !== -1 && pathParts[clientIndex + 1]) {
        console.log('Client ID from URL:', pathParts[clientIndex + 1]);
        return pathParts[clientIndex + 1];
    }
    
    // Fallback: try to get from data attribute
    const profileElement = document.querySelector('[data-client-id]');
    if (profileElement) {
        const clientId = profileElement.getAttribute('data-client-id');
        console.log('Client ID from data attribute:', clientId);
        return clientId;
    }
    
    console.error('No client ID found');
    return null;
}

function initializeProgressTab() {
    console.log('Initializing progress tab for client:', currentClientId);
    
    // Set up event listeners
    setupProgressEventListeners();
    
    // Load progress data
    loadProgressData();
}

function setupProgressEventListeners() {
    // Period selector for insights
    document.querySelectorAll('[data-period]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            loadProgressData();
        });
    });
    
    // Chart period selector
    document.querySelectorAll('[data-chart-period]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('[data-chart-period]').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const chartPeriod = this.dataset.chartPeriod;
            updateSentimentChart(chartPeriod);
        });
    });
}

async function loadProgressData() {
    try {
        console.log('Loading progress data for client:', currentClientId);
        
        if (!currentClientId) {
            console.error('No client ID available');
            showProgressError('Client ID not found');
            return;
        }
        
        // First test the basic API connection
        console.log('Testing basic API connection...');
        try {
            const testResponse = await fetch(`/api/test-progress/${currentClientId}`);
            const testResult = await testResponse.json();
            console.log('Test API response:', testResult);
        } catch (testError) {
            console.error('Test API failed:', testError);
        }
        
        const response = await fetch(`/api/client-progress/${currentClientId}/analytics`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP Error:', response.status, errorText);
            showProgressError(`Server error: ${response.status}`);
            return;
        }
        
        const result = await response.json();
        console.log('Progress data response:', result);
        
        if (result.success) {
            console.log('Progress data loaded successfully:', result.data);
            displayProgressData(result.data);
        } else {
            console.error('API returned error:', result.error);
            showProgressError(result.error || 'Failed to load progress data');
        }
    } catch (error) {
        console.error('Network/parsing error:', error);
        showProgressError('Network error: ' + error.message);
    }
}

function displayProgressData(data) {
    // Display progress insights
    displayProgressInsights(data.progress_insights);
    
    // Initialize charts
    initializeSentimentChart(data.sentiment_trend);
    initializeDomainChart(data.domain_breakdown);
    
    // Display keywords
    displayKeywords(data.top_keywords);
}

function displayProgressInsights(insights) {
    const insightsContainer = document.getElementById('progressInsights');
    if (!insightsContainer) return;
    
    if (!insights || insights.length === 0) {
        insightsContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-info-circle"></i>
                <p>No progress insights available yet. Add notes to see insights.</p>
            </div>
        `;
        return;
    }
    
    const insightsHTML = insights.map(insight => {
        let iconClass = 'fas fa-info-circle';
        let insightClass = 'neutral';
        
        // Determine insight type based on content
        if (insight.toLowerCase().includes('improved') || insight.toLowerCase().includes('positive')) {
            iconClass = 'fas fa-arrow-up';
            insightClass = 'positive';
        } else if (insight.toLowerCase().includes('declined') || insight.toLowerCase().includes('needs attention')) {
            iconClass = 'fas fa-arrow-down';
            insightClass = 'negative';
        }
        
        return `
            <div class="insight-item ${insightClass}">
                <i class="insight-icon ${iconClass}"></i>
                <div class="insight-text">${insight}</div>
            </div>
        `;
    }).join('');
    
    insightsContainer.innerHTML = insightsHTML;
}

function initializeSentimentChart(sentimentData) {
    const ctx = document.getElementById('sentimentChart');
    if (!ctx || !window.Chart) {
        console.log('Chart.js not available or canvas not found');
        return;
    }
    
    // Destroy existing chart
    if (sentimentChart) {
        sentimentChart.destroy();
    }
    
    // Prepare data for weekly view
    const weeklyData = sentimentData.weekly || [];
    const labels = weeklyData.map(item => item.period);
    const sentimentScores = weeklyData.map(item => item.average_sentiment);
    
    sentimentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sentiment Score',
                data: sentimentScores,
                borderColor: '#4682A9',
                backgroundColor: 'rgba(70, 130, 169, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#4682A9',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 45
                    }
                },
                y: {
                    min: -1,
                    max: 1,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            if (value === 1) return 'Positive';
                            if (value === 0) return 'Neutral';
                            if (value === -1) return 'Negative';
                            return value.toFixed(1);
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function updateSentimentChart(period) {
    if (!sentimentChart) return;
    
    // This would be called when switching between weekly/monthly
    // For now, we'll just reload the data
    loadProgressData();
}

function initializeDomainChart(domainData) {
    const ctx = document.getElementById('domainChart');
    if (!ctx || !window.Chart) {
        console.log('Chart.js not available or canvas not found');
        return;
    }
    
    // Destroy existing chart
    if (domainChart) {
        domainChart.destroy();
    }
    
    const labels = ['Emotional', 'Cognitive', 'Social'];
    const scores = [
        domainData.emotional?.average_score || 0,
        domainData.cognitive?.average_score || 0,
        domainData.social?.average_score || 0
    ];
    const mentions = [
        domainData.emotional?.mentions || 0,
        domainData.cognitive?.mentions || 0,
        domainData.social?.mentions || 0
    ];
    
    // Create colors based on scores
    const colors = scores.map(score => {
        if (score > 0.1) return '#4CAF50'; // Green for positive
        if (score < -0.1) return '#f44336'; // Red for negative
        return '#ff9800'; // Orange for neutral
    });
    
    domainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Domain Score',
                data: scores,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const index = context.dataIndex;
                            return `Mentions: ${mentions[index]}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    min: -1,
                    max: 1,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            if (value === 1) return 'Positive';
                            if (value === 0) return 'Neutral';
                            if (value === -1) return 'Negative';
                            return value.toFixed(1);
                        }
                    }
                }
            }
        }
    });
}

function displayKeywords(keywords) {
    const keywordsContainer = document.getElementById('keywordsCloud');
    if (!keywordsContainer) return;
    
    if (!keywords || keywords.length === 0) {
        keywordsContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-tags"></i>
                <p>No keywords available yet. Add notes to see keywords.</p>
            </div>
        `;
        return;
    }
    
    // Sort keywords by count for size variation
    const sortedKeywords = keywords.sort((a, b) => b.count - a.count);
    const maxCount = sortedKeywords[0].count;
    
    const keywordsHTML = sortedKeywords.map((item, index) => {
        let sizeClass = 'small';
        if (index < 3) sizeClass = 'large';
        else if (index < 6) sizeClass = 'medium';
        
        return `
            <div class="keyword-item ${sizeClass}" title="Mentioned ${item.count} times">
                ${item.keyword}
                <span class="keyword-count">${item.count}</span>
            </div>
        `;
    }).join('');
    
    keywordsContainer.innerHTML = keywordsHTML;
}

function showProgressError(message) {
    // Show error in insights container
    const insightsContainer = document.getElementById('progressInsights');
    if (insightsContainer) {
        insightsContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
    
    // Show error in charts
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        container.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    });
    
    // Show error in keywords
    const keywordsContainer = document.getElementById('keywordsCloud');
    if (keywordsContainer) {
        keywordsContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// Export functions for global access
window.loadProgressData = loadProgressData;
window.initializeProgressTab = initializeProgressTab;
