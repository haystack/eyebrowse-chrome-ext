///////////Global vars/////////////
// global website base, set to localhost for testing, use deploy script to change
var baseUrl = "http://eyebrowse.herokuapp.com";
var siteName = "Eyebrowse";

///////////////////models//////////////////////

//This object can represent either a whitelist or blacklist for a given user. On an update send results to server to update stored data. On intialization set is synced with server. Should allow offline syncing in the future.
var FilterListItem = Backbone.Model.extend({
    parse: function(data) {
        if (data !== null) {
            return {
                url : data.url, 
                id : data.id,
            }
        }
    },
});

/*
    collection to hold filterlist items
*/
var FilterList = Backbone.Collection.extend({

    model: FilterListItem,

    initialize: function(type) {
        _.bindAll(this);
        this.type = type;
        this._fetch();
    },

    getType : function() {
        return this.get("type")
    },

    url : function() {
        return getApiURL(this.type)
    },

    parse: function(data, res){
        if (res.status === 200) {
            return data.objects;    
        }
    },

    //wrapper for fetch which logs user out if server errs
    _fetch: function() {
        this.fetch({
            error: _.bind(function(model, xhr, options) {
                if (typeof user !== "undefined"){
                    user.logout();   
                }
            }, this)
        });
    },
});


/*
    User object holds the status of the user, the cookie from the server, preferences for eyebrowse, whitelist, blacklist, etc.
*/
var User = Backbone.Model.extend({
    defaults: {
        "loggedIn" : false,
        "whitelist" : new FilterList("whitelist"),
        "blacklist" : new FilterList("blacklist"),
        "username" : "",
        "resourceURI" : "/api/v1/user/",
        "ignoreLoginPrompt" : false,
    },

    initialize : function() {
        _.bindAll(this); //allow access to 'this' in callbacks with "this" meaning the object not the context of the callback

    },

    getWhitelist : function() {
        return this.get("whitelist")
    },

    getBlacklist : function() {
        return this.get("blacklist")
    },

    getUsername : function() {
        return this.get("username")
    },

    getResourceURI : function() {
        return this.get("resourceURI")
    },

    isLoggedIn : function() {
        if (this.getUsername() === this.defaults.username || this.getResourceURI() === this.defaults.resourceURI) {
            this.logout();
        }
        return this.get("loggedIn")
    },

    ignoreLoginPrompt : function(){
        return this.get("ignoreLoginPrompt");
    },

    //when the user is logged in set the boolean to give logged in views.
    setLogin : function(status) {
        this.set({ 
            "loggedIn": status,
        });

        var map = {
            "true" : "login",
            "false" : "logout"
        };

        loginBadge(map[status]);
    },

    login : function() {
        this.setLogin(true);
        this.setLoginPrompt(false);
    },

    logout : function() {
        this.setLogin(false);
    },
    
    setUsername : function(username) {
        this.set({ 
            "username": username,
        });
        this.setResourceURI(username);
    },

    setResourceURI : function(username) {
        this.set({
            "resourceURI" : sprintf("/api/v1/user/%s/", username)
        })
    },

    setWhitelist : function(whitelist) {
        this.setFilterSet("whitelist", whitelist);
    },

    setBlacklist : function(blacklist) {
        this.setFilterSet("blacklist", blacklist);
    },

    setFilterSet : function(type, list) {
        this.set({
            type : list
        })
    },

    setLoginPrompt : function(bool){
        this.set({
            "ignoreLoginPrompt" : bool
        });
    },

    //check if a url is in the blacklist
    inBlackList : function(url) {
        return this.inSet("blacklist", url)
    },

    //check if a url is in the whitelise
    inWhitelist : function(url) {
        return this.inSet("whitelist", url)
    },

    //check if url is in a set (either whitelist or blacklist)
    // documentation for URL.js : http://medialize.github.com/URI.js/docs.html
    inSet : function(setType, url) {
        var set = this.get(setType);
        var uri = new URI(url)
        var hostname = uri.hostname();
        var protocol = uri.protocol();
        return (set.where({"url" : hostname}).length || set.where({"url" : protocol}).length || set.where(url).length)
    },

    //save the current state to local storage
    saveState : function(){
        localStorage.user = JSON.stringify(this);
    },
});


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
    if (!user.isLoggedIn()){
        if (!user.ignoreLoginPrompt()){
            chrome.tabs.sendMessage(tabId, {
                "action" : "prompt",
                "type" : "loginPrompt",
                "baseUrl" : baseUrl,
            })
        }
      return  
    } 
    var timeCheck = checkTimeDelta();
    var uri = new URI(url);
    //if its not in the whitelist lets check that the user has it
    
    if (!user.inWhitelist(url) && !user.inBlackList(url)) {

        timeCheck.allow = false; // we need to wait for prompt callback
        chrome.tabs.sendMessage(tabId, {
            "action": "prompt",
            "type" : "trackPrompt", 
            "baseUrl": baseUrl,
        });
        tmpItem = {
            "tabId" : tabId,
            "url" : url,
            "favIconUrl" : favIconUrl,
            "title" : title,
            "event_type" : event_type,
        }

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
        if (tmpItem !== null) {
            finishOpen(tmpItem.tabId, tmpItem.url, tmpItem.favIconUrl, tmpItem.title, tmpItem.event_type)
            tmpItem = null
        }
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

/*
    Open the popup so the user can logback in again
*/
function handleLoginMsg(){
    chrome.tabs.create({'url': chrome.extension.getURL('html/popup.html')}, function(tab) {});
}

/*
    Store the ignore state so the popup message does not display
*/
function handleIgnoreMsg(){
    user.setLoginPrompt(true);
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
    var getParams = ""
    for (var key in params) {
      getParams += sprintf("&%s=%s", key, params[key]);
    }
    
    if (getParams !== "") {
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
/*
    create or parase and return localhistory object
*/
function loadLocalHistory() {
    localString = localStorage.local_history;
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
        localStorage.user = JSON.stringify(user)//store user
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
    remove all local history from storage
*/
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

/*
    clear login flag
*/
function loginBadge(e) {
    if (e == "logout") {
        updateBadge("!");
    } else if(e == "login") {
        updateBadge("");
    }
}

/*
    initialize the badge with login flag
*/
function initBadge() {
    chrome.browserAction.setBadgeBackgroundColor({"color":"#cd5c5c"});
    if (!user.isLoggedIn()) {
        loginBadge("logout");
    }
}

// dictionary mapping all open items. Keyed on tabIds and containing all information to be written to the log. 
var activeItem;
var tmpItem;

local_history = loadLocalHistory();

user = getLocalStorageUser();
initBadge()

localStorage.setItem("baseUrl", baseUrl);