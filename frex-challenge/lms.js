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
const exportBtn = document.getElementById('exportBtn');

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
    // Date Filter (matches YYYY-MM-DD)
    if (dateFilter.value) {
      const leadDate = new Date(lead.createdAt).toISOString().split('T')[0];
      if (leadDate !== dateFilter.value) return false;
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
      <td><span class="status-badge ${statusClass}">${lead.status}</span></td>
      <td>
        <button class="btn btn-logout" onclick="alert('Essay:\\n${lead.ideaEssay || 'No essay yet.'}')">View</button>
      </td>
      <td>
        ${lead.status === 'Step 1 Complete' 
          ? `<button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; width: auto;" onclick="window.sendNotification('${lead.id}', '${lead.name}', '${lead.email}', '${lead.track}', '${lead.status}', this)">Send Reminder</button>` 
          : `<span style="font-size: 11px; color: var(--text-muted);">No action</span>`}
      </td>
    `;
    leadsTableBody.appendChild(row);
  });
}

// Event Listeners for Filters
dateFilter.addEventListener('change', renderTable);
statusFilter.addEventListener('change', renderTable);
trackFilter.addEventListener('change', renderTable);

// CSV Export Logic
exportBtn.addEventListener('click', () => {
  if (leadsData.length === 0) {
    alert("No data to export");
    return;
  }
  
  // Get filtered data
  const filteredData = leadsData.filter(lead => {
    if (dateFilter.value && new Date(lead.createdAt).toISOString().split('T')[0] !== dateFilter.value) return false;
    if (statusFilter.value && lead.status !== statusFilter.value) return false;
    if (trackFilter.value && lead.track !== trackFilter.value) return false;
    return true;
  });

  if (filteredData.length === 0) {
    alert("No data matches current filters");
    return;
  }

  // Define headers
  const headers = ["Date", "Name", "Email", "University", "Track", "Status", "Idea Essay"];
  
  // Map rows
  const csvRows = filteredData.map(lead => {
    const dateStr = new Date(lead.createdAt).toISOString();
    // Escape quotes in essay
    const essay = lead.ideaEssay ? `"${lead.ideaEssay.replace(/"/g, '""')}"` : '""';
    return `${dateStr},"${lead.name}","${lead.email}","${lead.university}","${lead.track}","${lead.status}",${essay}`;
  });

  const csvString = [headers.join(','), ...csvRows].join('\\n');
  
  // Trigger download
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', 'frex_leads_export.csv');
  a.click();
});

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
