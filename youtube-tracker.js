// YouTube channel tracker
let currentChannel = null;
let videoStartTime = null;
let checkInterval = null;

function getChannelName() {
  // Try multiple selectors for channel name
  const selectors = [
    'ytd-channel-name a',
    '#channel-name a',
    '#owner-name a',
    'ytd-video-owner-renderer a'
  ];

  for (const selector of selectors) {
    const elem = document.querySelector(selector);
    if (elem && elem.textContent) {
      return elem.textContent.trim();
    }
  }

  return null;
}

function isVideoPlaying() {
  const video = document.querySelector('video');
  return video && !video.paused;
}

function trackVideo() {
  const channel = getChannelName();

  if (channel && isVideoPlaying()) {
    if (channel !== currentChannel) {
      // Save previous channel time
      if (currentChannel && videoStartTime) {
        const timeSpent = Date.now() - videoStartTime;
        browser.runtime.sendMessage({
          type: 'youtubeChannel',
          channel: currentChannel,
          time: timeSpent
        });
      }

      // Start tracking new channel
      currentChannel = channel;
      videoStartTime = Date.now();
    }
  } else if (currentChannel && videoStartTime) {
    // Video paused or navigated away
    const timeSpent = Date.now() - videoStartTime;
    browser.runtime.sendMessage({
      type: 'youtubeChannel',
      channel: currentChannel,
      time: timeSpent
    });
    currentChannel = null;
    videoStartTime = null;
  }
}

// Start tracking
function startTracking() {
  if (checkInterval) {
    clearInterval(checkInterval);
  }

  checkInterval = setInterval(trackVideo, 2000);
}

// Wait for page to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startTracking);
} else {
  startTracking();
}

// Handle navigation (YouTube is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;

    // Save current time if switching videos
    if (currentChannel && videoStartTime) {
      const timeSpent = Date.now() - videoStartTime;
      browser.runtime.sendMessage({
        type: 'youtubeChannel',
        channel: currentChannel,
        time: timeSpent
      });
      currentChannel = null;
      videoStartTime = null;
    }

    // Restart tracking
    setTimeout(trackVideo, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// Save on page unload
window.addEventListener('beforeunload', () => {
  if (currentChannel && videoStartTime) {
    const timeSpent = Date.now() - videoStartTime;
    browser.runtime.sendMessage({
      type: 'youtubeChannel',
      channel: currentChannel,
      time: timeSpent
    });
  }
});
