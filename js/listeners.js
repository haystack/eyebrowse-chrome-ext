//Interesting events:
//When an active tab is selected
//When a new page is navigated to (must filter for bad urls)
//When a new window is opened/selected (same as tab event)
//When a tab or window is destroyed
//API info: http://developer.chrome.com/extensions/tabs.html

///////////////Event listeners/////////////// 
/*
    Specific to Chrome. Each calls the data processor function in main.js to be processed and recorded if necessary. The handler checks for things like restricted sites and user permissions that are set. This allows firefox to use the same main. 

    Fires when the active tab in a window changes. Note that the tab's URL may not be set at the time this event fired, but you can listen to onUpdated events to be notified when a URL is set.

    We need to listen for both (so we know when new tabs/windows appear). But no double counting.
*/
function activeTabListener() {
    chrome.tabs.onActivated.addListener(function(activeInfo) {
        var event_type = 'focus';
        openTab(activeInfo.tabId, event_type)
    });
}

/*
    Fired when a tab is updated.
*/
function updatedTabListener() {
   chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        var event_type = 'update';
        openTab(tabId, event_type)
    }); 
}

/*
    Fired when a tab is closed.
*/
function removedTabListener() {
    chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
        var event_type = 'destroy';
        closeTab(tabId, event_type);
    });
}

/*
    Helper function to get the tab with tabId and open the item
*/
function openTab(tabId, event_type) {
    chrome.tabs.get(tabId, function (tab) {
        if (tab !== undefined && tab.status === 'complete') {
            openItem(tabId, tab.url, tab.favIconUrl,  tab.title, event_type);
        }
        
    });
}

/*
    Helper function to get the tab with tabId and close the item
*/
function closeTab(tab, event_type) {
    if (tab !== undefined && tab.status === 'complete') {
        closeItem(tab.id, tab.url, event_type, false);
    }
}

/*
    Fired when the window is closed. Writes all data to local_storage
*/
function closedWindowListener() {
    chrome.windows.onRemoved.addListener(function() {
        localStorage.local_history = JSON.stringify(local_history);
        localStorage.user = JSON.stringify(user);
    });
}

//////////////////Content-script to Background script listener//////////////////

/*
    Listen to messages between the content and background script
*/
function messageListener() {
    chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
        executeMessage(request, sender, sendResponse);
        return true;
    });
}

/*
    helper to execute messages between content and background script
*/
function executeMessage(request, sender, sendResponse) {
    var message = JSON.parse(request);
    var action = message.action;
    if (action == "idle") {
       handleIdleMsg(message, sender.tab.id);
    } else {
        console.log("Action not supported");
    }
}

  
/*
    run each listener type
*/
function runListeners(){ 
    activeTabListener();
    updatedTabListener();
    removedTabListener();
    closedWindowListener();
    messageListener();
}

$(document).ready(function(){
    runListeners();
});