// Initialize Google Analytics properly
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

// Ensure gtag is loaded before using
document.addEventListener('DOMContentLoaded', function() {
    if (typeof gtag === 'undefined') {
        console.error('Google Analytics not loaded properly');
        return;
    }
    
    // Track initial pageview
    gtag('js', new Date());
    gtag('config', 'G-C349FZ7XRJ', {
        'page_path': window.location.pathname,
        'page_title': document.title
    });
});

// Update tracking functions to ensure gtag exists
function trackEvent(eventCategory, eventAction, eventLabel) {
    if (typeof gtag === 'undefined') {
        console.error('Google Analytics not loaded');
        return;
    }
    gtag('event', eventAction, {
        'event_category': eventCategory,
        'event_label': eventLabel
    });
    console.log('GA Event:', eventCategory, eventAction, eventLabel);
}

// Track user authentication events
function trackAuthEvent(action, label) {
    trackEvent('Authentication', action, label);
}

// Track game events
function trackGameEvent(action, label) {
    trackEvent('Game', action, label);
}

// Track chat events
function trackChatEvent(action, label) {
    trackEvent('Chat', action, label);
}

// Track character events
function trackCharacterEvent(action, label) {
    trackEvent('Character', action, label);
}

// Track admin actions
function trackAdminEvent(action, label) {
    trackEvent('Admin', action, label);
}

// Track error events
function trackError(errorType, errorMessage) {
    trackEvent('Error', errorType, errorMessage);
}

// Track biome changes
function trackBiomeChange(fromBiome, toBiome) {
    trackEvent('Game', 'Biome Change', `${fromBiome} to ${toBiome}`);
}

// Initialize error tracking
window.addEventListener('error', function(e) {
    trackError('JavaScript Error', `${e.message} (${e.filename}:${e.lineno})`);
});

// Track page load timing
window.addEventListener('load', function() {
    if (window.performance) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        trackEvent('Performance', 'Page Load Time', String(loadTime));
    }
});

// Expose tracking functions globally
window.Analytics = {
    trackEvent,
    trackAuthEvent,
    trackGameEvent,
    trackChatEvent,
    trackCharacterEvent,
    trackAdminEvent,
    trackError,
    trackBiomeChange
};
