//Interesting events:
//When an active tab is selected
//When a new page is navigated to (must filter for bad urls)
//When a new window is opened/selected (same as tab event)
//When a tab or window is destroyed
visited = []
chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function (tab) {
        visited.push(tab.url);
    });
    update_badge();
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    chrome.tabs.get(tabId, function (tab) {
    
            visited.push(tab.url);
    
        });
    
    update_badge();
});




