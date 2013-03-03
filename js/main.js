///////////Global vars/////////////
var baseUrl = "http://localhost:5000"; 
// global website base, set to localhost for testing
//var baseUrl = "http://eyebrowse.herokuapp.com"
var siteName = "Eyebrowse";



//////////////////data collection handlers/////////////
/*
    inputs:
    tabId - indentifer of tab (unique to session only)
    url - url of the tab making the request
    favIconUrl - used for displaying content
    title - title of the webpage the tab is displaying
    event_type - whether a tab is opening or closing/navigating to a new page etc
*/
function openItem(tabId, url, favIconUrl, title, event_type) {
    var timeCheck = checkTimeDelta();
    var uri = new URI(url);
    //if its not in the whitelist lets check that the user has it
    if (!user.inWhitelist(url) && !user.inBlackList(url)) {

        timeCheck.allow = false; // we need to wait for prompt callback
        chrome.tabs.sendMessage(tabId, {
            "action": "prompt", 
            "baseUrl": baseUrl,
        }, function(message){
                handleFilterListMsg(message);
                if (message.type === "whitelist") {
                    finishOpen(tabId, url, favIconUrl, title, event_type);
                }
            });

    } else if (user.inBlackList(url)) {
        return
    } 

    if (timeCheck.allow){
        finishOpen(tabId, url, favIconUrl, title, event_type, timeCheck.time);
    }
}


/*
    change the active item state of an item.
    called after a prompt is allowed or timecheck passes
*/
function finishOpen(tabId, url, favIconUrl, title, event_type, time) {
    
    if (activeItem !== undefined) {
        closeItem(activeItem.tabId, activeItem.url, "blur", time);
    };
        
    //reassign the active item to be the current tab
    activeItem = {
        "tabId" : tabId,
        "url" : url,
        "favIconUrl" : favIconUrl,
        "title" : title,
        "start_event" : event_type,
        "start_time" : new Date(),
    };
}

/* 
    There is only ever one activeItem at a time so only close out the active one. 
    This event will be fired when a tab is closed or unfocused but we would have already "closed" the item so we don"t want to do it again.
*/
function closeItem(tabId, url, event_type, time) {
    if (activeItem === undefined) return;
    var time = time || new Date(); // time is undefined for destroy event
    if (activeItem.tabId === tabId && !user.inBlackList(url)) {
        //write to local storage
        var item = $.extend({}, activeItem); //copy activeItem

        item.end_event = event_type;
        item.end_time = time;
        item.total_time = item.end_time - item.start_time;
        item.humanize_time = moment.humanizeDuration(item.total_time);
        local_history.push(item);

        // send data for server and sync whitelist/blacklist
        if (local_history.length) {
            dumpData();
            user.getWhitelist()._fetch();
            user.getBlacklist()._fetch();   
        }
    }
}

/*
    checks if the time between the current event and the active item is greater than the delta. Default delta is 900ms
*/
function checkTimeDelta(delta) {
    var delta = delta || 900
    var now = new Date();
    var allow = true; // default to true allows active item to be set initially
    if (activeItem !== undefined) { 
        allow = (now.getTime() - activeItem.start_time) > delta
    }

    return {
        "allow" : allow,
        "time" : now,
    }
}


///////////////message handlers///////////////
/*
    create a whitelist or blacklist item when the message comes in from the prompt
*/
function handleFilterListMsg(message) {
    var type = message.type;
    var url = message.url;
    var list;
    if (type == "whitelist") {
        list = user.getWhitelist();
    } else if (type == "blacklist") {
        list = user.getBlacklist();
    } else {
        return
    }
    m = list.create({
        "url" : url,
        "user" : user.getResourceURI(),
    });

    localStorage.user = JSON.stringify(user);
}

/*
    close an item if the tab is idle
*/
function handleIdleMsg(message, tabId) { 
    var type = message.type;
    if (type == "openItem")  {
        openTab(tabId, "focus");
    } else if (type == "closeItem" && activeItem !== undefined) { 
        closeTab(tabId, "idle", function() {
                activeItem = undefined;
            });
    }
}

///////////////////server comm utils///////////////////

/*
    Posts data to server
*/
function dumpData() {
    var backlog = []
    var url = getApiURL("history-data");
    var stop = false;
    $.each(local_history, function(index, item){
        if (stop) return; //stop sending on error
        payload = serializePayload(item);
        var that = this;
        $.ajax({
            type: "POST",
            url: url,
            data: payload,
            dataType: "text",
            processData:  false,
            contentType: "application/json",
            error: function(jqXHR, textStatus, errorThrown){
                stop = true;
                user.logout(); //notify user of server error
            },
            success: function(data, textStatus, jqXHR) {
               local_history.splice(index, 1); //remove item from history on success 
            },
        });
    });
}

/*
    converts the data to JSON serialized
*/
function serializePayload(payload) {
    payload.user = user.getResourceURI();
    payload.src = "chrome"
    return JSON.stringify(payload);
}

/*
    build an API url for the given inputs
*/
function getApiURL(resource, id, params) {
    params = params || {};
    var apiBase = sprintf("%s/api/v1/%s", baseUrl, resource);
    var getParams = "
    for (var key in params) {
      getParams += sprintf("&%s=%s", key, params[key]);
    }
    
    if (getParams !== ") {
        apiBase += "?" + getParams.slice(1);
    }
    if (id != null) {
        apiBase += "/" + id;
    } 
    return apiBase
}

/*
Helper to open urls from the extension to the main website
*/
function openLink(url) {
    chrome.tabs.create({"url": url});
}

///////////////////local storage methods//////////////
function loadLocalHistory() {
    localString = localStorage.local_history/;
    localString = (localString) ? localString : "[]"; // catch undefined case
    return JSON.parse(localString);
}

/*
    Get and return the user from local storage.
    If no user is found create a new one.
    If an old user exists unJSON the object and return it.
*/
function getLocalStorageUser() {
    var storedUser = localStorage.user;
    if (storedUser === undefined || storedUser === "null") {
        user = new User();
        return user
    }

    o = JSON.parse(storedUser);
    var u = new User();

    u.setUsername(o.username);
    u.setLogin(o.loggedIn);
    u.setBlacklist(o.blacklist);
    u.setWhitelist(o.whitelist);

    return u
}

/*
    Clear the local storage for the given key
*/ 
function clearLocalStorage(key) {
    localStorage[key] = null;
}

/*
    Check if these are already set to avoid overwriting.
*/
function localSetIfNull(key, value) {
    if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, value);
    }
}

function clearStorage(){
    localStorage.removeItem("local_history")
    local_history = []
}

//////////////////badge utils////////////////////


/*
    wraps the chrome badge update function
*/
function updateBadge(text) {
    chrome.browserAction.setBadgeText(
        {
            "text" : text
        });
}

function loginBadge(e) {
    if (e == "logout") {
        updateBadge("!");
    } else if(e == "login") {
        updateBadge(");
    }
}

function initBadge() {
    chrome.browserAction.setBadgeBackgroundColor({"color":"#cd5c5c"});
    if (!user.isLoggedIn()) {
        loginBadge("logout");
    }
}


$(document).ready(function(){
    // dictionary mapping all open items. Keyed on tabIds and containing all information to be written to the log. 
    var activeItem;

    local_history = loadLocalHistory();

    user = getLocalStorageUser();
    initBadge()

    localSetIfNull("baseUrl", baseUrl);  
});