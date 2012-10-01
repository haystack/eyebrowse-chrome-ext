//Interesting events:
//When an active tab is selected
//When a new page is navigated to (must filter for bad urls)
//When a new window is opened/selected (same as tab event)
//When a tab or window is destroyed
//API info: http://developer.chrome.com/extensions/tabs.html


///////////////Event listeners/////////////// 
//Specific to Chrome. Each calls the data processer function in main.js to be process and recorded if necessary. These functions should check things like incognito windows, the handler checks for things like restricted sites and user permissions that are set. This allows firefox to use the same main. 

visited = []

//Fires when the active tab in a window changes. Note that the tab's URL may not be set at the time this event fired, but you can listen to onUpdated events to be notified when a URL is set.
//We need to listen for both (so we know when new tabs/windows appear). But no double counting. 
chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function (tab) {
        record_history(activeInfo.tabId, tab.url, tab.title)
    });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    chrome.tabs.get(tabId, function (tab) {
        record_history(tabId, tab.url, tab.title)
    });
    
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    chrome.tabs.get(tabId, function (tab) {
        record_history(tabId, tab.url, tab.title)
    });
});


