import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let leadsData = [];

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
    if (trackFilter.value && lead.track !== trackFilter.value) return false;
    
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
      <td class="track-cell" title="${lead.track}">${lead.track}</td>
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
      if (trackFilter.value && lead.track !== trackFilter.value) return false;
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
