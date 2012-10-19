//Interesting events:
//When an active tab is selected
//When a new page is navigated to (must filter for bad urls)
//When a new window is opened/selected (same as tab event)
//When a tab or window is destroyed
//API info: http://developer.chrome.com/extensions/tabs.html


///////////////Event listeners/////////////// 
//Specific to Chrome. Each calls the data processor function in main.js to be processed and recorded if necessary. The handler checks for things like restricted sites and user permissions that are set. This allows firefox to use the same main. 

//Fires when the active tab in a window changes. Note that the tab's URL may not be set at the time this event fired, but you can listen to onUpdated events to be notified when a URL is set.
//We need to listen for both (so we know when new tabs/windows appear). But no double counting.
function activeTabListener() {
    chrome.tabs.onActivated.addListener(function(activeInfo) {
        var event_type = 'focus';
        chrome.tabs.get(activeInfo.tabId, function (tab) {
            open_item(activeInfo.tabId, tab.url, tab.faviconUrl,  tab.title, event_type);
        });
    });
}

//Fired when a tab is updated.
function updatedTabListener() {
   chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        var event_type = 'update';
        chrome.tabs.get(tabId, function (tab) {
            open_item(tabId, tab.url, tab.faviconUrl, tab.title, event_type);
        });
        
    }); 
}

//Fired when a tab is closed. Note: A listener can be registered for this event without requesting the 'tabs' permission in the manifest.
function removedTabListener() {
    chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
        var event_type = 'destroy';
        chrome.tabs.get(tabId, function (tab) {
            if (tab != undefined) {
                close_item(tabId, tab.url, event_type);
            }
        });
    });
}

//Fired when the window is closed. Writes all data to local_storage
function closedWindowListener() {
    chrome.windows.onRemoved.addListener(function() {
        alert("closing window");
        localStorage['local_storage'] = JSON.stringify(local_storage);
        localStorage['user'] = JSON.stringify(user);
    })
}

//tmp for dev
function update_badge() {
    chrome.browserAction.setBadgeText(
        {
            text: String(open_items.length)
        });
}
// run each listener
activeTabListener();
updatedTabListener();
removedTabListener();
closedWindowListener();
