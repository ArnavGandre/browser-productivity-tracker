// Track current tab and time
let currentTab = null;
let startTime = Date.now();
let hourlyData = {};

// Initialize storage
browser.storage.local.get(['websiteData', 'youtubeData', 'lastNotification']).then(result => {
  if (!result.websiteData) {
    browser.storage.local.set({ websiteData: {} });
  }
  if (!result.youtubeData) {
    browser.storage.local.set({ youtubeData: {} });
  }
  if (!result.lastNotification) {
    browser.storage.local.set({ lastNotification: Date.now() });
  }
});

// Set up hourly alarm
browser.alarms.create('hourlyReport', { periodInMinutes: 60 });

// Listen for alarm
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'hourlyReport') {
    sendHourlyReport();
  }
});

// Get domain from URL
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

// Save time spent on current tab
async function saveTime() {
  if (!currentTab || !currentTab.url) return;

  const domain = getDomain(currentTab.url);
  if (!domain) return;

  const timeSpent = Date.now() - startTime;

  // Get existing data
  const result = await browser.storage.local.get('websiteData');
  const websiteData = result.websiteData || {};

  // Update website data
  if (!websiteData[domain]) {
    websiteData[domain] = { time: 0, visits: 0, lastVisit: Date.now() };
  }
  websiteData[domain].time += timeSpent;
  websiteData[domain].lastVisit = Date.now();

  // Update hourly tracking
  if (!hourlyData[domain]) {
    hourlyData[domain] = 0;
  }
  hourlyData[domain] += timeSpent;

  // Save to storage
  await browser.storage.local.set({ websiteData });
}

// Track tab changes
browser.tabs.onActivated.addListener(async (activeInfo) => {
  await saveTime();

  const tab = await browser.tabs.get(activeInfo.tabId);
  currentTab = tab;
  startTime = Date.now();

  // Increment visit count
  const domain = getDomain(tab.url);
  if (domain) {
    const result = await browser.storage.local.get('websiteData');
    const websiteData = result.websiteData || {};

    if (!websiteData[domain]) {
      websiteData[domain] = { time: 0, visits: 0, lastVisit: Date.now() };
    }
    websiteData[domain].visits += 1;

    await browser.storage.local.set({ websiteData });
  }
});

// Track URL changes
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && currentTab && currentTab.id === tabId) {
    await saveTime();
    currentTab = tab;
    startTime = Date.now();

    // Increment visit count
    const domain = getDomain(tab.url);
    if (domain) {
      const result = await browser.storage.local.get('websiteData');
      const websiteData = result.websiteData || {};

      if (!websiteData[domain]) {
        websiteData[domain] = { time: 0, visits: 0, lastVisit: Date.now() };
      }
      websiteData[domain].visits += 1;

      await browser.storage.local.set({ websiteData });
    }
  }
});

// Save time periodically
setInterval(saveTime, 5000);

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'youtubeChannel') {
    updateYouTubeData(message.channel, message.time);
  }
});

// Update YouTube channel data
async function updateYouTubeData(channelName, timeSpent) {
  const result = await browser.storage.local.get('youtubeData');
  const youtubeData = result.youtubeData || {};

  if (!youtubeData[channelName]) {
    youtubeData[channelName] = 0;
  }
  youtubeData[channelName] += timeSpent;

  // Update hourly tracking
  const key = `YouTube: ${channelName}`;
  if (!hourlyData[key]) {
    hourlyData[key] = 0;
  }
  hourlyData[key] += timeSpent;

  await browser.storage.local.set({ youtubeData });
}

// Send hourly report
async function sendHourlyReport() {
  const entries = Object.entries(hourlyData);

  if (entries.length === 0) {
    return;
  }

  // Sort by time spent
  entries.sort((a, b) => b[1] - a[1]);

  // Format message
  let message = 'Last hour activity:\n\n';
  entries.slice(0, 5).forEach(([site, time]) => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    message += `${site}: ${minutes}m ${seconds}s\n`;
  });

  if (entries.length > 5) {
    message += `\n...and ${entries.length - 5} more`;
  }

  // Send notification
  browser.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Browse Tracker - Hourly Report',
    message: message
  });

  // Reset hourly data
  hourlyData = {};

  // Update last notification time
  await browser.storage.local.set({ lastNotification: Date.now() });
}

// Initialize current tab
browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
  if (tabs[0]) {
    currentTab = tabs[0];
    startTime = Date.now();
  }
});
