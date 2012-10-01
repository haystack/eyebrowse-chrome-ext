//In background.js:
// React when a browser action's icon is clicked.
visited = []
chrome.tabs.onActivated.addListener(function(info) {
  console.log(info.tabId);
  chrome.tabs.get(info.tabId,function (tab) {console.log(tab.url);visited.push(tab.url);console.log(visited.length)})
  chrome.browserAction.setBadgeText({text: visited.length + ''});
});