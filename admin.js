import { db, auth } from "./firebase.js";
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ================= DOM ELEMENTS =================
const totalVisitorsEl = document.getElementById("totalVisitors");
const insideLibraryEl = document.getElementById("insideLibrary");
const totalCheckinsMonthEl = document.getElementById("totalCheckinsMonth");
const topReasonEl = document.getElementById("topReason");
const logTable = document.getElementById("logTable");
const userTable = document.getElementById("userTable");

// Filters
const searchEmail = document.getElementById("searchEmail");
const filterReason = document.getElementById("filterReason");
const filterDate = document.getElementById("filterDate");
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");
const clearFilters = document.getElementById("clearFilters");

// Logout Button
const logoutBtn = document.getElementById("logoutBtn");

// Pages
const pages = {
  dashboard: document.getElementById("dashboardPage"),
  users: document.getElementById("usersPage"),
  logs: document.getElementById("logsPage"),
  statistics: document.getElementById("statisticsPage")
};

// Charts
let reasonChart, monthlyTrendChart, hourlyChart, reasonStatsChart, weeklyChart;

// Data
let allLogs = [];
let allUsers = [];

// ================= LOGOUT FUNCTION =================
logoutBtn?.addEventListener('click', () => {
  signOut(auth)
    .then(() => {
      window.location.href = "login.html"; // redirect to login page
    })
    .catch(err => {
      console.error("Logout failed:", err);
      alert("Logout failed! Check console for details.");
    });
});

// ================= UTILITY =================
function normalizeReason(reason) {
  if (!reason) return null;
  const map = { reading: "Reading", research: "Research", "computer use": "Computer Use", computer: "Computer Use", pc: "Computer Use" };
  return map[reason.toLowerCase()] || reason;
}

function inRange(date) {
  const from = dateFrom.value ? new Date(dateFrom.value + 'T00:00:00') : null;
  const to = dateTo.value ? new Date(dateTo.value + 'T23:59:59.999') : null;
  
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

// ================= CHART INITIALIZATION =================
function initReasonChart() {
  const ctx = document.getElementById('reasonChart')?.getContext('2d');
  if (!ctx) return;
  reasonChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: ['📚 Reading', '🔬 Research', '💻 Computer Use'], datasets: [{ data: [0,0,0], backgroundColor: ['#3b82f6','#22c55e','#f59e0b'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function initStatisticsCharts() {
  // Monthly Trend
  const monthlyCtx = document.getElementById('monthlyTrendChart')?.getContext('2d');
  if (monthlyCtx) monthlyTrendChart = new Chart(monthlyCtx, {
    type: 'line',
    data: { labels: [], datasets: [{ label:'Check-ins', data:[], borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.2)', tension:0.4, fill:true, pointBackgroundColor:'#3b82f6', pointBorderColor:'#fff', pointBorderWidth:2, pointRadius:6 }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true }, x:{ grid:{ color:'rgba(0,0,0,0.05)' } } } }
  });

  // Hourly Usage
  const hourlyCtx = document.getElementById('hourlyChart')?.getContext('2d');
  if (hourlyCtx) hourlyChart = new Chart(hourlyCtx, {
    type: 'bar',
    data: { labels:Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')), datasets:[{ data:Array(24).fill(0), backgroundColor:'rgba(59,130,246,0.8)', borderRadius:8, borderSkipped:false }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true } } }
  });

  // Reason Breakdown (Polar)
  const reasonCtx = document.getElementById('reasonStatsChart')?.getContext('2d');
  if (reasonCtx) reasonStatsChart = new Chart(reasonCtx, {
    type: 'polarArea',
    data: { labels:['📚 Reading','🔬 Research','💻 Computer'], datasets:[{ data:[0,0,0], backgroundColor:['rgba(59,130,246,0.6)','rgba(34,197,94,0.6)','rgba(245,158,11,0.6)'], borderColor:['#3b82f6','#22c55e','#f59e0b'], borderWidth:2 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } }
  });

  // Weekly Pattern
  const weeklyCtx = document.getElementById('weeklyChart')?.getContext('2d');
  if (weeklyCtx) weeklyChart = new Chart(weeklyCtx, {
    type:'doughnut',
    data: { labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], datasets:[{ data:[0,0,0,0,0,0,0], backgroundColor:['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4'], borderWidth:0 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right' } } }
  });
}

// ================= DASHBOARD =================
function renderDashboard() {
  const today = new Date();
  let total=0, inside=0, month=0;
  let reasons={ Reading:0, Research:0, "Computer Use":0 };

  allLogs.forEach(d=>{
    const timeIn = d.timeIn?.toDate ? d.timeIn.toDate() : new Date(d.timeIn);
    if(!d.email||!timeIn) return;

    if(timeIn.toDateString()===today.toDateString()) total++;
    if(!d.timeOut) inside++;
    if(timeIn.getMonth()===today.getMonth() && timeIn.getFullYear()===today.getFullYear()) month++;

    const r = normalizeReason(d.reason);
    if(r && reasons[r]!==undefined) reasons[r]++;
  });

  totalVisitorsEl.textContent = total;
  insideLibraryEl.textContent = inside;
  totalCheckinsMonthEl.textContent = month;

  let top="-", max=0;
  for(let r in reasons){ if(reasons[r]>max){ max=reasons[r]; top=r; } }
  topReasonEl.textContent = top;

  if(reasonChart){ reasonChart.data.datasets[0].data=[reasons.Reading,reasons.Research,reasons["Computer Use"]]; reasonChart.update(); }
}

// ================= USERS =================
function renderUsers() {
  if (!allUsers || allUsers.length === 0) {
    userTable.innerHTML = `<tr><td colspan="5" style="text-align:center;">No registered users found.</td></tr>`;
    return;
  }

  // Calculate total visits
  const visitCounts = {};
  allLogs.forEach(log => { 
    if(!log.email) return;
    const email = log.email.trim().toLowerCase();
    visitCounts[email] = (visitCounts[email] || 0) + 1;
  });

  userTable.innerHTML = "";

  allUsers
    .sort((a,b) => (visitCounts[b.email?.trim().toLowerCase()] || 0) - (visitCounts[a.email?.trim().toLowerCase()] || 0))
    .forEach(u => {
      const isBlocked = u.blocked === true;
      const totalVisits = visitCounts[u.email?.trim().toLowerCase()] || 0;

      userTable.innerHTML += `
        <tr>
          <td>${u.name || 'N/A'}</td>
          <td>${u.email || 'N/A'}</td>
          <td>${u.course || 'N/A'}</td>
          <td style="font-weight:600; color:#3b82f6;">${totalVisits}</td>
          <td>
            <button class="block-btn" data-id="${u.id}" style="
              padding:4px 8px; border:none; border-radius:4px; cursor:pointer;
              background-color:${isBlocked?'#f87171':'#34d399'}; color:#fff;
            ">
              ${isBlocked?'Unblock':'Block'}
            </button>
          </td>
        </tr>
      `;
    });

  // Add event listeners to block/unblock buttons
  document.querySelectorAll(".block-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-id");
      const user = allUsers.find(u => u.id === userId);
      if (!user) return;

      try {
        // Toggle blocked status in Firestore
        await updateDoc(doc(db,"users",userId), { blocked: !user.blocked });

        // Update UI immediately
        user.blocked = !user.blocked; // update local state
        btn.textContent = user.blocked ? 'Unblock' : 'Block';
        btn.style.backgroundColor = user.blocked ? '#f87171' : '#34d399';

      } catch (err) {
        console.error("Error updating block status:", err);
        alert("Failed to update user block status!");
      }
    });
  });
}

// ================= LOGS =================
function renderLogs() {
  logTable.innerHTML = "";

  allLogs
    .filter(d=>{
      const timeIn=d.timeIn?.toDate?d.timeIn.toDate():new Date(d.timeIn);
      if(!d.email||!timeIn) return false;
      const emailMatch=!searchEmail.value||d.email.toLowerCase().includes(searchEmail.value.toLowerCase());
      const reasonMatch=!filterReason.value||normalizeReason(d.reason)===filterReason.value;
      const dateMatch=!filterDate.value||timeIn.toDateString()===new Date(filterDate.value).toDateString();
      const rangeMatch=inRange(timeIn);
      return emailMatch&&reasonMatch&&dateMatch&&rangeMatch;
    })
    .sort((a,b)=>(b.timeIn?.seconds||0)-(a.timeIn?.seconds||0))
    .slice(0,1000)
    .forEach(d=>{
      const timeIn=d.timeIn?.toDate?d.timeIn.toDate():new Date(d.timeIn);
      const timeOut=d.timeOut?.toDate?d.timeOut.toDate():d.timeOut;
      const reason=normalizeReason(d.reason)||'N/A';
      logTable.innerHTML += `
        <tr>
          <td style="font-family:monospace;">${d.email}</td>
          <td>${reason}</td>
          <td>${timeIn.toLocaleString('en-PH')}</td>
          <td>${timeOut?`<span class="status-out">✅ ${new Date(timeOut).toLocaleString('en-PH')}</span>`:`<span class="status-in">🔴 Inside</span>`}</td>
        </tr>
      `;
    });
}

// ================= STATISTICS =================
function calculateAdvancedStats() {
  const stats={peakHour:{hour:0,count:0},avgStay:0,peakDay:{day:'',count:0},retentionRate:0,hourly:Array(24).fill(0),weekly:{Mon:0,Tue:0,Wed:0,Thu:0,Fri:0,Sat:0,Sun:0},reasons:{Reading:0,Research:0,'Computer Use':0}};
  let totalStayTime=0, validStays=0, emailCounts={};

  allLogs.forEach(d=>{
    const timeIn=d.timeIn?.toDate?d.timeIn.toDate():new Date(d.timeIn);
    const timeOut=d.timeOut?.toDate?d.timeOut.toDate():null;
    if(!d.email||!timeIn) return;

    const email = d.email.trim().toLowerCase();
    emailCounts[email] = (emailCounts[email]||0)+1;

    const h=timeIn.getHours(); stats.hourly[h]++; if(stats.hourly[h]>stats.peakHour.count){ stats.peakHour.hour=h; stats.peakHour.count=stats.hourly[h]; }

    const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; const day=days[timeIn.getDay()]; stats.weekly[day]++; if(stats.weekly[day]>stats.peakDay.count){ stats.peakDay.day=day; stats.peakDay.count=stats.weekly[day]; }

    const r=normalizeReason(d.reason); if(r && stats.reasons[r]!==undefined) stats.reasons[r]++;

    if(timeOut){ const stayMins=(timeOut-timeIn)/(1000*60); if(stayMins>0&&stayMins<1440){ totalStayTime+=stayMins; validStays++; } }
  });

  const unique=Object.keys(emailCounts).length; let repeat=0;
  for(let e in emailCounts) if(emailCounts[e]>1) repeat++;
  stats.retentionRate=unique>0?Math.round((repeat/unique)*100):0;
  stats.avgStay=validStays>0?Math.round(totalStayTime/validStays):0;

  return stats;
}

function renderStatistics() {
  const stats = calculateAdvancedStats();
  document.getElementById('peakHour').textContent=`${stats.peakHour.hour.toString().padStart(2,'0')}:00`;
  document.getElementById('avgStay').textContent=`${stats.avgStay}min`;
  document.getElementById('peakDay').textContent=stats.peakDay.day;
  document.getElementById('retentionRate').textContent=`${stats.retentionRate}%`;

  if(hourlyChart){ hourlyChart.data.datasets[0].data=stats.hourly; hourlyChart.update('none'); }
  if(reasonStatsChart){ reasonStatsChart.data.datasets[0].data=[stats.reasons.Reading,stats.reasons.Research,stats.reasons['Computer Use']]; reasonStatsChart.update('none'); }
  if(weeklyChart){ weeklyChart.data.datasets[0].data=[stats.weekly.Mon,stats.weekly.Tue,stats.weekly.Wed,stats.weekly.Thu,stats.weekly.Fri,stats.weekly.Sat,stats.weekly.Sun]; weeklyChart.update('none'); }

  if(monthlyTrendChart){
    const days30=Array(30).fill(0);
    const labels30=Array(30).fill('').map((_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(29-i)); return d.toLocaleDateString('en-CA',{month:'short',day:'numeric'}); });
    allLogs.forEach(d=>{ const t=d.timeIn?.toDate?d.timeIn.toDate():new Date(d.timeIn); const diff=Math.floor((new Date()-t)/(1000*60*60*24)); if(diff>=0&&diff<30) days30[29-diff]++; });
    monthlyTrendChart.data.labels=labels30; monthlyTrendChart.data.datasets[0].data=days30; monthlyTrendChart.update('none');
  }
}

// ================= MAIN RENDER =================
function renderAll() {
  renderDashboard();
  renderUsers();
  renderLogs();
  renderStatistics();
}

// ================= REALTIME DATA =================
onSnapshot(collection(db,"logs"),snapshot=>{
  allLogs = snapshot.docs.map(doc=>({ id:doc.id, ...doc.data() }));
  renderAll();
});

onSnapshot(collection(db,"users"),snapshot=>{
  allUsers = snapshot.docs.map(doc=>({ id:doc.id, ...doc.data() }));
  renderAll();
});

// ================= EVENT LISTENERS =================
searchEmail?.addEventListener('input',renderLogs);
filterReason?.addEventListener('change',renderLogs);
filterDate?.addEventListener('change',renderLogs);
dateFrom?.addEventListener('change',renderLogs);
dateTo?.addEventListener('change',renderLogs);
clearFilters?.addEventListener('click',()=>{
  searchEmail.value=""; filterReason.value=""; filterDate.value=""; dateFrom.value=""; dateTo.value="";
  renderLogs();
});

// ================= SIDEBAR NAVIGATION =================
document.querySelectorAll(".menu-item").forEach(item=>{
  item.addEventListener("click",()=>{
    document.querySelectorAll(".menu-item").forEach(i=>i.classList.remove("active"));
    item.classList.add("active");
    Object.values(pages).forEach(p=>p.style.display="none");
    const page=item.getAttribute("data-page");
    if(pages[page]){ pages[page].style.display="block"; if(page==='dashboard') renderDashboard(); else if(page==='users') renderUsers(); else if(page==='logs') renderLogs(); else if(page==='statistics') renderStatistics(); }
  });
});

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded',()=>{
  initReasonChart();
  initStatisticsCharts();
  console.log('🚀 NEU Admin Dashboard Loaded!');
});