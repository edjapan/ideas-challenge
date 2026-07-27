import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let leadsData = [];
let leadsLineChartInstance = null;
let trackPieChartInstance = null;
let patternsRadarChartInstance = null;

function getShortTrackName(longTrack) {
  if (!longTrack) return 'Unknown';
  const trackStr = longTrack.toLowerCase();
  if (trackStr.includes('creative')) return 'Creative Businesses';
  if (trackStr.includes('environmental') || trackStr.includes('earth') || trackStr.includes('climate')) return 'Earth / Climate';
  if (trackStr.includes('scientific') || trackStr.includes('space') || trackStr.includes('swarm') || trackStr.includes('satellite')) return 'Space Exploration';
  return 'Unknown';
}

// DOM Elements
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');

const leadsTableBody = document.getElementById('leadsTableBody');
const dateFilter = document.getElementById('dateFilter');
const statusFilter = document.getElementById('statusFilter');
const trackFilter = document.getElementById('trackFilter');
const exportZohoBtn = document.getElementById('exportZohoBtn');

// Simple Hardcoded Auth
loginBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  
  if (email === 'admin@futurecareerhub.in' && password === 'frex2026') {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    fetchLeadsFromFirestore();
  } else {
    loginError.textContent = 'Invalid credentials. Please check your email and password.';
    loginError.style.display = 'block';
  }
});

function fetchLeadsFromFirestore() {
  const q = query(collection(db, "applications"), orderBy("createdAt", "desc"));
  onSnapshot(q, (querySnapshot) => {
    leadsData = [];
    querySnapshot.forEach((doc) => {
      leadsData.push({ id: doc.id, ...doc.data() });
    });
    renderTable();
  });
}

logoutBtn.addEventListener('click', () => {
  dashboardView.style.display = 'none';
  loginView.style.display = 'flex';
  emailInput.value = '';
  passwordInput.value = '';
  loginError.style.display = 'none';
});

// Render Table
function renderTable() {
  leadsTableBody.innerHTML = '';
  
  const filteredData = leadsData.filter(lead => {
    // Date Filter
    if (dateFilter.value && dateFilter.value !== 'all') {
      const leadDateObj = new Date(lead.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (dateFilter.value === 'today') {
        if (leadDateObj < today) return false;
      } else if (dateFilter.value === 'yesterday') {
        if (leadDateObj < yesterday || leadDateObj >= today) return false;
      } else if (dateFilter.value === '7days') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (leadDateObj < sevenDaysAgo) return false;
      } else if (dateFilter.value === '30days') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (leadDateObj < thirtyDaysAgo) return false;
      }
    }
    // Status Filter
    if (statusFilter.value && lead.status !== statusFilter.value) return false;
    // Track Filter
    const shortTrack = getShortTrackName(lead.track);
    if (trackFilter.value && shortTrack !== trackFilter.value) return false;
    
    return true;
  });

  filteredData.forEach(lead => {
    const row = document.createElement('tr');
    const dateStr = new Date(lead.createdAt).toLocaleDateString();
    
    const statusClass = lead.status === 'Idea Submitted' ? 'status-completed' : 'status-step1';
    
    row.innerHTML = `
      <td>${dateStr}</td>
      <td>${lead.name}</td>
      <td>${lead.email}</td>
      <td>${lead.university}</td>
      <td class="track-cell" title="${lead.track}">${getShortTrackName(lead.track)}</td>
      <td><span class="status-text ${statusClass}">${lead.status}</span></td>
      <td>
        <button class="btn btn-logout" onclick="window.viewEssay('${lead.id}')">View</button>
      </td>
      <td>
        <div style="display: flex; gap: 8px;">
        ${lead.status === 'Step 1 Complete' 
          ? `<button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; width: auto;" onclick="window.sendNotification('${lead.id}', '${lead.name}', '${lead.email}', '${lead.track}', '${lead.status}', this)">Send Reminder</button>
             <button class="btn btn-logout" style="padding: 6px 12px; font-size: 12px; width: auto;" onclick="window.copyLink('${lead.id}', this)">Copy Link</button>` 
          : `<span style="font-size: 11px; color: var(--text-muted);">No action</span>`}
        </div>
      </td>
    `;
    leadsTableBody.appendChild(row);
  });

  // Call chart render
  renderCharts(filteredData);
}

// Chart Rendering Logic
function renderCharts(filteredData) {
  const ctxLine = document.getElementById('leadsLineChart');
  const ctxPie = document.getElementById('trackPieChart');
  const ctxRadar = document.getElementById('patternsRadarChart');
  if (!ctxLine || !ctxPie || !ctxRadar || typeof Chart === 'undefined') return;

  // 1. Line Chart (Leads over time)
  const dateCounts = {};
  filteredData.forEach(lead => {
    const dateStr = new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
  });
  
  // Sort dates
  const sortedDates = Object.keys(dateCounts).sort((a,b) => new Date(a + " 2026") - new Date(b + " 2026")); // Simple sort assuming current year
  const dateValues = sortedDates.map(d => dateCounts[d]);

  if (leadsLineChartInstance) leadsLineChartInstance.destroy();
  
  Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
  Chart.defaults.font.family = 'Inter';

  const gradient = ctxLine.getContext('2d').createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(235, 122, 101, 0.4)');
  gradient.addColorStop(1, 'rgba(235, 122, 101, 0.0)');

  leadsLineChartInstance = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: 'Leads',
        data: dateValues,
        borderColor: '#EB7A65',
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#161218',
        pointBorderColor: '#EB7A65',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { stepSize: 1 } },
        x: { grid: { display: false } }
      }
    }
  });

  // 2. Doughnut Chart (Tracks)
  const trackCounts = {};
  filteredData.forEach(lead => {
    let track = getShortTrackName(lead.track);
    trackCounts[track] = (trackCounts[track] || 0) + 1;
  });
  
  const trackLabels = Object.keys(trackCounts);
  const trackValues = trackLabels.map(t => trackCounts[t]);

  if (trackPieChartInstance) trackPieChartInstance.destroy();

  trackPieChartInstance = new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: trackLabels,
      datasets: [{
        data: trackValues,
        backgroundColor: ['#EB7A65', '#6EE7C5', '#FFB37A', '#8C4646'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 11 } } }
      }
    }
  });

  // 3. Radar Chart (Time/Day patterns across Topics)
  const radarAxes = ['Morning', 'Afternoon', 'Evening', 'Weekday', 'Weekend'];
  const topicData = {
    'Space Exploration': [0, 0, 0, 0, 0],
    'Earth / Climate': [0, 0, 0, 0, 0],
    'Creative Businesses': [0, 0, 0, 0, 0]
  };

  filteredData.forEach(lead => {
    const track = getShortTrackName(lead.track);
    if (!topicData[track]) return;

    const d = new Date(lead.createdAt);
    const hour = d.getHours();
    const day = d.getDay();

    // Time
    if (hour >= 5 && hour < 12) topicData[track][0]++; // Morning
    else if (hour >= 12 && hour < 18) topicData[track][1]++; // Afternoon
    else topicData[track][2]++; // Evening

    // Day
    if (day === 0 || day === 6) topicData[track][4]++; // Weekend
    else topicData[track][3]++; // Weekday
  });

  if (patternsRadarChartInstance) patternsRadarChartInstance.destroy();

  patternsRadarChartInstance = new Chart(ctxRadar, {
    type: 'radar',
    data: {
      labels: radarAxes,
      datasets: [
        {
          label: 'Space',
          data: topicData['Space Exploration'],
          borderColor: '#EB7A65',
          backgroundColor: 'rgba(235, 122, 101, 0.2)',
          borderWidth: 2,
          pointRadius: 2
        },
        {
          label: 'Earth',
          data: topicData['Earth / Climate'],
          borderColor: '#6EE7C5',
          backgroundColor: 'rgba(110, 231, 197, 0.2)',
          borderWidth: 2,
          pointRadius: 2
        },
        {
          label: 'Creative',
          data: topicData['Creative Businesses'],
          borderColor: '#FFB37A',
          backgroundColor: 'rgba(255, 179, 122, 0.2)',
          borderWidth: 2,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 10 } } }
      },
      scales: {
        r: {
          angleLines: { color: 'rgba(255,255,255,0.1)' },
          grid: { color: 'rgba(255,255,255,0.1)' },
          pointLabels: { color: 'rgba(255,255,255,0.7)', font: { size: 11 } },
          ticks: { display: false }
        }
      }
    }
  });
}

// Event Listeners for Filters
dateFilter.addEventListener('change', renderTable);
statusFilter.addEventListener('change', renderTable);
trackFilter.addEventListener('change', renderTable);

// Export logic removed

// Zoho CRM Export Logic
if (exportZohoBtn) {
  exportZohoBtn.addEventListener('click', () => {
    if (leadsData.length === 0) {
      alert("No data to export");
      return;
    }
    
    // Get filtered data
    const filteredData = leadsData.filter(lead => {
      if (dateFilter.value && dateFilter.value !== 'all') {
        const leadDateObj = new Date(lead.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (dateFilter.value === 'today' && leadDateObj < today) return false;
        if (dateFilter.value === 'yesterday' && (leadDateObj < yesterday || leadDateObj >= today)) return false;
        if (dateFilter.value === '7days' && leadDateObj < new Date(today.setDate(today.getDate() - 7))) return false;
        if (dateFilter.value === '30days' && leadDateObj < new Date(today.setDate(today.getDate() - 30))) return false;
      }
      if (statusFilter.value && lead.status !== statusFilter.value) return false;
      const shortTrack = getShortTrackName(lead.track);
      if (trackFilter.value && shortTrack !== trackFilter.value) return false;
      return true;
    });

    if (filteredData.length === 0) {
      alert("No data matches current filters");
      return;
    }

    // Zoho CRM Standard & Custom Fields
    const headers = ["Last Name", "Company", "Email", "Phone", "Lead Status", "Track", "Question", "Idea Essay"];
    
    // Map rows
    const csvRows = filteredData.map(lead => {
      const name = lead.name ? `"${lead.name.replace(/"/g, '""')}"` : '""';
      const company = lead.university ? `"${lead.university.replace(/"/g, '""')}"` : '""';
      const email = lead.email ? `"${lead.email.replace(/"/g, '""')}"` : '""';
      const phone = lead.phone ? `"${lead.phone.replace(/"/g, '""')}"` : '""';
      const status = lead.status ? `"${lead.status.replace(/"/g, '""')}"` : '""';
      const track = lead.track ? `"${lead.track.replace(/"/g, '""')}"` : '""';
      const question = lead.question ? `"${lead.question.replace(/"/g, '""')}"` : '""';
      const essay = lead.ideaEssay ? `"${lead.ideaEssay.replace(/"/g, '""')}"` : '""';
      
      return `${name},${company},${email},${phone},${status},${track},${question},${essay}`;
    });

    const csvString = [headers.join(','), ...csvRows].join('\\n');
    
    // Trigger download
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'zoho_leads_export.csv');
    a.click();
  });
}

// EmailJS Notification Logic
window.sendNotification = async function(leadId, name, email, track, status, buttonElement) {
  const originalText = buttonElement.textContent;
  buttonElement.textContent = 'Sending...';
  buttonElement.disabled = true;

  try {
    // Only 'Step 1 Complete' sends a reminder.
    if (status !== 'Step 1 Complete') {
      return;
    }
    
    let templateId = 'template_o9mzhys'; 

    const uniqueLink = `${window.location.origin}/frex-challenge/submit-idea?id=${leadId}`;
    
    await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: 'service_fgv0pwa', // Your existing service ID
        template_id: templateId,
        user_id: 'EErfqFIU4oDEsN8ww', // Your existing user ID
        template_params: {
          name: name,
          email: email,
          track: track,
          unique_link: uniqueLink
        }
      })
    });

    buttonElement.textContent = 'Sent! ✔';
    buttonElement.style.background = '#6EE7C5';
    buttonElement.style.color = '#000';
    
    setTimeout(() => {
      buttonElement.textContent = originalText;
      buttonElement.style.background = '';
      buttonElement.style.color = '';
      buttonElement.disabled = false;
    }, 3000);
    
  } catch (err) {
    console.error("Error sending email: ", err);
    alert("Failed to send email. Check console for details.");
    buttonElement.textContent = originalText;
    buttonElement.disabled = false;
  }
};
window.copyLink = function(leadId, buttonElement) {
  const originalText = buttonElement.textContent;
  const uniqueLink = `${window.location.origin}/frex-challenge/submit-idea?id=${leadId}`;
  
  navigator.clipboard.writeText(uniqueLink).then(() => {
    buttonElement.textContent = 'Copied!';
    buttonElement.style.color = '#6EE7C5';
    setTimeout(() => {
      buttonElement.textContent = originalText;
      buttonElement.style.color = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
    alert('Failed to copy link. Check console.');
  });
};

window.viewEssay = function(leadId) {
  const lead = leadsData.find(l => l.id === leadId);
  if (!lead) return;
  
  const essayContent = document.getElementById('essayContent');
  const essayModal = document.getElementById('essayModal');
  
  essayContent.textContent = lead.ideaEssay || 'No essay submitted yet.';
  essayModal.style.display = 'flex';
};
