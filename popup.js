// Format time in human-readable format
function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// Format date
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return 'Just now';
  } else if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Load and display data
async function loadData() {
  const result = await browser.storage.local.get(['websiteData', 'youtubeData']);
  const websiteData = result.websiteData || {};
  const youtubeData = result.youtubeData || {};

  // Calculate total time
  let totalTime = 0;
  Object.values(websiteData).forEach(data => {
    totalTime += data.time;
  });

  document.getElementById('totalTime').textContent = `Total browsing time: ${formatTime(totalTime)}`;

  // Display website data
  const websiteBody = document.getElementById('websiteBody');
  const websites = Object.entries(websiteData).sort((a, b) => b[1].time - a[1].time);

  if (websites.length === 0) {
    websiteBody.innerHTML = '<tr><td colspan="4" class="no-data">No data yet. Start browsing!</td></tr>';
  } else {
    websiteBody.textContent = '';
    websites.forEach(([domain, data]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
      <td>${domain}</td>
      <td class="time">${formatTime(data.time)}</td>
      <td>${data.visits}</td>
      <td>${formatDate(data.lastVisit)}</td>
      `;
      websiteBody.appendChild(tr);
    });
  }

  // Display YouTube data
  const youtubeBody = document.getElementById('youtubeBody');
  const channels = Object.entries(youtubeData).sort((a, b) => b[1] - a[1]);

  if (channels.length === 0) {
    youtubeBody.innerHTML = '<tr><td colspan="2" class="no-data">No YouTube data yet. Watch some videos!</td></tr>';
  } else {
    youtubeBody.textContent = '';
    channels.forEach(([channel, time]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
      <td class="channel-name">${channel}</td>
      <td class="time">${formatTime(time)}</td>
      `;
      youtubeBody.appendChild(tr);
    });
  }
}

// Clear all data
async function clearData() {
  if (confirm('Are you sure you want to clear all tracking data? This cannot be undone.')) {
    await browser.storage.local.set({
      websiteData: {},
      youtubeData: {},
      lastNotification: Date.now()
    });
    loadData();
  }
}

// Event listeners
document.getElementById('refresh').addEventListener('click', loadData);
document.getElementById('clearData').addEventListener('click', clearData);

// Load data on popup open
loadData();
