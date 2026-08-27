// ==============================================================================
// DATARYWORKS EXPENSE TRACKER - CHART.JS RENDERING ENGINE
// ==============================================================================

import { MONTHLY_TREND_CHART_DATA, SAVINGS_OVER_TIME_DATA } from './data.js';

class ChartManager {
  constructor() {
    this.chartInstances = {};
  }

  destroyChart(id) {
    if (this.chartInstances[id]) {
      this.chartInstances[id].destroy();
      delete this.chartInstances[id];
    }
  }

  destroyAll() {
    Object.keys(this.chartInstances).forEach(id => {
      this.destroyChart(id);
    });
  }

  // --- 1. OVERVIEW: INCOME VS EXPENSE TREND (Line Chart) ---
  renderOverviewTrend(canvasId, trendData) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !trendData) return;

    // Deteksi label Sumbu-X (Tahun jika 'year' tersedia, atau 'month' jika bulanan)
    const labels = trendData.map(d => d.year || d.month);
    const incomeData = trendData.map(d => (d.income || 0) / 1000000);
    const expenseData = trendData.map(d => (d.expense || 0) / 1000000);
    const savingData = trendData.map(d => (d.saving || 0) / 1000000);

    this.chartInstances[canvasId] = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            borderColor: '#047857',
            backgroundColor: '#047857',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3
          },
          {
            label: 'Expense',
            data: expenseData,
            borderColor: '#e11d48',
            backgroundColor: '#e11d48',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3
          },
          {
            label: 'Saving',
            data: savingData,
            borderColor: '#2563eb',
            backgroundColor: '#2563eb',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            align: 'center',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              padding: 15,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.dataset.label}: Rp${(item.raw * 1000000).toLocaleString('id-ID')}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: '#64748b' }
          },
          y: {
            beginAtZero: true,
            suggestedMax: 10,
            ticks: {
              font: { size: 10 },
              color: '#64748b',
              callback: function(value) {
                if (value === 0) return '0';
                return value + 'M';
              }
            },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });
  }

  // --- 2. OVERVIEW: EXPENSE BY CATEGORY (Donut Chart) ---
  renderExpenseDonut(canvasId, categoryData, totalAmountText = 'Rp6.500.000') {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = categoryData.length > 0 ? categoryData.map(c => c.name) : ['No Expense'];
    const data = categoryData.length > 0 ? categoryData.map(c => c.amount) : [1];
    const colors = categoryData.length > 0 ? categoryData.map(c => c.color) : ['#e2e8f0'];

    this.chartInstances[canvasId] = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: categoryData.length > 0 ? 4 : 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: categoryData.length > 0,
            callbacks: {
              label: (item) => ` ${item.label}: Rp${item.raw.toLocaleString('id-ID')} (${((item.raw / data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)`
            }
          }
        }
      },
      plugins: [{
        id: 'centerText',
        afterDraw: (chart) => {
          const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
          ctx.save();
          ctx.font = '800 15px Inter, sans-serif';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(totalAmountText, left + width / 2, top + height / 2);
          ctx.restore();
        }
      }]
    });
  }

  // --- 3. OVERVIEW: CASH FLOW SUMMARY (Bar Waterfall) ---
  renderCashFlowSummary(canvasId, { totalIncome = 10000000, totalExpense = 6500000, totalSaving = 2000000, remaining = 1500000 }) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    this.chartInstances[canvasId] = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Total Income', 'Total Expense', 'Total Saving', 'Remaining'],
        datasets: [{
          data: [totalIncome / 1000000, -(totalExpense / 1000000), totalSaving / 1000000, remaining / 1000000],
          backgroundColor: ['#198754', '#ef4444', '#0d6efd', '#10b981'],
          borderRadius: 6,
          barThickness: 48
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` Rp${(Math.abs(item.raw) * 1000000).toLocaleString('id-ID')}`
            }
          }
        },
        scales: {
          y: {
            suggestedMax: 10,
            ticks: {
              callback: (val) => (val >= 0 ? '' : '-') + Math.abs(val) + 'M',
              font: { size: 11, color: '#64748b' }
            },
            grid: { color: '#f1f5f9' }
          },
          x: {
            grid: { display: false },
            ticks: { 
              font: { size: 11, weight: '500', color: '#475569' },
              maxRotation: 0,
              minRotation: 0
            }
          }
        }
      }
    });
  }

  // --- 4. INCOME VS EXPENSE: STACKED BARS ---
  renderStackedBarChart(canvasId, datasets, isIncome = true) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    this.chartInstances[canvasId] = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            align: 'center',
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 12,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.dataset.label}: Rp${Math.round(item.raw * 1000000).toLocaleString('id-ID')}`
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: { font: { size: 11, color: '#64748b' } }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: function(val) {
                if (val === 0) return '0';
                if (val >= 1) return val + 'M';
                return (val * 1000) + 'K';
              },
              font: { size: 11, color: '#64748b' }
            },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });
  }

  // --- 5. CATEGORY ANALYSIS & INCOME VS EXPENSE: SUBCATEGORY DONUT ---
  renderSubcategoryDonut(canvasId, data, subtitle, centerAmount) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const amountToDisplay = centerAmount || (typeof subtitle === 'string' && subtitle.startsWith('Rp') ? subtitle : '');

    const centerTextPlugin = {
      id: `centerText_${canvasId}`,
      beforeDraw(chart) {
        const { width, height, ctx } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (amountToDisplay) {
          ctx.font = '800 15px Inter, sans-serif';
          ctx.fillStyle = '#0F172A';
          ctx.fillText(amountToDisplay, width / 2, height / 2);
        }
        ctx.restore();
      }
    };

    this.chartInstances[canvasId] = new window.Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.name),
        datasets: [{
          data: data.map(d => d.amount),
          backgroundColor: data.map(d => d.color),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: Rp${Number(item.raw).toLocaleString('id-ID')}`
            }
          }
        }
      },
      plugins: [centerTextPlugin]
    });
  }

  // --- 6. SAVING GOALS: OVERALL GAUGE & AREA GROWTH ---
  renderGoalProgressGauge(canvasId, progressPercent = 43.8) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const remaining = Math.max(0, 100 - progressPercent);

    this.chartInstances[canvasId] = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Achieved', 'Remaining'],
        datasets: [{
          data: [progressPercent, remaining],
          backgroundColor: ['#198754', '#e2e8f0'],
          borderWidth: 0,
          circumference: 270,
          rotation: 225
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '76%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      },
      plugins: [{
        id: 'gaugeCenter',
        afterDraw: (chart) => {
          const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
          ctx.save();
          ctx.font = 'bold 22px Inter, sans-serif';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${progressPercent}%`, left + width / 2, top + height / 2 - 6);

          ctx.font = '500 12px Inter, sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.fillText('Overall Progress', left + width / 2, top + height / 2 + 16);
          ctx.restore();
        }
      }]
    });
  }

  renderSavingsGrowthArea(canvasId, trendData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Deteksi label Sumbu-X (Tahun jika 'year' tersedia, atau 'month' jika bulanan)
    const labels = trendData && trendData.length > 0 
      ? trendData.map(d => d.year || d.month) 
      : SAVINGS_OVER_TIME_DATA.map(d => d.month);

    const data = trendData && trendData.length > 0 
      ? trendData.map(d => d.amount) 
      : SAVINGS_OVER_TIME_DATA.map(d => d.amount);

    const maxVal = Math.max(...data, 10);

    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(25, 135, 84, 0.25)');
    gradient.addColorStop(1, 'rgba(25, 135, 84, 0.0)');

    this.chartInstances[canvasId] = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Total Saved',
          data,
          borderColor: '#198754',
          backgroundColor: gradient,
          fill: true,
          borderWidth: 2.5,
          pointBackgroundColor: '#198754',
          pointRadius: 4,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` Total Saved: Rp${(item.raw * 1000000).toLocaleString('id-ID')}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: Math.ceil(maxVal * 1.1),
            ticks: {
              callback: (val) => val === 0 ? '0' : val + 'M',
              font: { size: 11, color: '#64748b' }
            },
            grid: { color: '#f1f5f9' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, color: '#64748b' } }
          }
        }
      }
    });
  }
}

export const chartManager = new ChartManager();