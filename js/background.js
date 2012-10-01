//In background.js:
// React when a browser action's icon is clicked.
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

function update_badge() {

    chrome.browserAction.setBadgeText(
        {
            text: String(visited.length + 1)
        });
}