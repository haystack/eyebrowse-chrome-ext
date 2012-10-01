//In background.js:
// React when a browser action's icon is clicked.
visited = []
chrome.tabs.onActivated.addListener(function(activeInfo) {
    console.log(activeInfo.tabId);
    chrome.tabs.get(activeInfo.tabId, function (tab) {
        console.log(tab.url);
        visited.push(tab.url);
        console.log(visited.length)
    });
    chrome.browserAction.setBadgeText(
        {
            text: (visited.length + 1) + ''
        });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    chrome.tabs.get(tabId, function (tab) {
            console.log(tab.url);
            visited.push(tab.url);
            console.log(visited.length)
        });
    chrome.browserAction.setBadgeText(
        {
            text: (visited.length + 1) + ''
        });

});