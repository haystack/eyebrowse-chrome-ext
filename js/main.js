///////////Global vars/////////////
var baseUrl = "http://localhost:5000"; 
// global website base, set to localhost for testing
//var baseUrl = "http://eyebrowse.herokuapp.com"
var siteName = "Eyebrowse";

///////////Models//////////////

//This object can represent either a whitelist or blacklist for a given user. On an update send results to server to update stored data. On intialization set is synced with server. Should allow offline syncing in the future.
var FilterListItem = Backbone.Model.extend({
    parse: function(data) {
        if (data != null) {
            return {
                url : data.url, 
                id : data.id,
            }
        }
    },
});


var FilterList = Backbone.Collection.extend({

    model: FilterListItem,

    initialize: function(type) {
        _.bindAll(this);
        this.type = type;
        this.fetch()
    },
    getType : function() {
        return this.get('type')
    },
    url : function() {
        return getApiURL(this.type)
    },
    parse: function(data, res){
        if (res.status === 200) {
            return data.objects;    
        }
        user.logout() //triggers logout badge update
    },
});


//User object holds the status of the user, the cookie from the server, preferences for eyebrowse, whitelist, blacklist, etc
var User = Backbone.Model.extend({
    defaults: {
        'loggedIn' : false,
        'whitelist' : new FilterList('whitelist'),
        'blacklist' : new FilterList('blacklist'),
        'username' : '',
        'resourceURI' : '/api/v1/user/',
    },

    initialize : function() {
        _.bindAll(this); //allow access to 'this' in callbacks with 'this' meaning the object not the context of the callback

    },

    getWhitelist : function() {
        return this.get('whitelist')
    },

    getBlacklist : function() {
        return this.get('blacklist')
    },

    getUsername : function() {
        return this.get('username')
    },

    getResourceURI : function() {
        return this.get('resourceURI')
    },

    isLoggedIn : function() {
        if (this.getUsername() === this.defaults.username || this.getResourceURI() === this.defaults.resourceURI) {
            this.logout();
        }
        return this.get('loggedIn')
    },

    //when the user is logged in set the boolean to give logged in views.
    setLogin : function(status) {
        this.set({ 
            'loggedIn': status,
        });

        var map = {
            'true' : 'login',
            'false' : 'logout'
        };

        loginBadge(map[status]);
    },

    login : function() {
        this.setLogin(true);
    },

    logout : function() {
        this.setLogin(false);
    },
    
    setUsername : function(username) {
        this.set({ 
            'username': username,
        });
        this.setResourceURI(username);
    },

    setResourceURI : function(username) {
        this.set({
            'resourceURI' : sprintf('/api/v1/user/%s/', username)
        })
    },

    setWhitelist : function(whitelist) {
        this.setFilterSet('whitelist', whitelist);
    },

    setBlacklist : function(blacklist) {
        this.setFilterSet('blacklist', blacklist);
    },

    setFilterSet : function(type, list) {
        this.set({
            type : list
        })
    },

    //check if a url is in the blacklist
    inBlackList : function(url) {
        return this.inSet('blacklist', url)
    },

    //check if a url is in the whitelise
    inWhitelist : function(url) {
        return this.inSet('whitelist', url)
    },

    //check if url is in a set (either whitelist or blacklist)
    // documentation for URL.js : http://medialize.github.com/URI.js/docs.html
    inSet : function(setType, url) {
        var set = this.get(setType);
        var uri = new URI(url)
        var hostname = uri.hostname();
        var protocol = uri.protocol();
        return (set.where({'url' : hostname}).length || set.where({"url" : protocol}).length || set.where(url).length)
    },

    //save the current state to local storage
    saveState : function(){
        localStorage.user = JSON.stringify(this);
    }
});


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
        chrome.tabs.sendMessage(tabId, {"action": "prompt"},function(res){
                if (res != undefined && res.prompRes == 'allow') {
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

function finishOpen(tabId, url, favIconUrl, title, event_type, time) {
    
    if (activeItem != undefined) {
        closeItem(activeItem.tabId, activeItem.url, 'blur', time);
    };
        
    //reassign the active item to be the current tab
    activeItem = {
        'tabId' : tabId,
        'url' : url,
        'favIconUrl' : favIconUrl,
        'title' : title,
        'start_event' : event_type,
        'start_time' : new Date(),
    };
}

/* 
    There is only ever one activeItem at a time so only close out the active one. 
    This event will be fired when a tab is closed or unfocused but we would have already 'closed' the item so we don't want to do it again.
*/
function closeItem(tabId, url, event_type, time, callback) {
    if (activeItem === undefined) return;
    var time = time || new Date(); // time is undefined for destroy event
    var callback = callback || false;
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
            user.getWhitelist().fetch();
            user.getBlacklist().fetch();   
        }
    }
    if (callback) {
        callback();
    }
}

function executeMessage(request, sender, sendResponse) {
    var message = JSON.parse(request);
    var action = message.action;
    if (action == "filterlist") {
        handleFilterListMsg(message);
    } else if (action == "idle") {
       handleIdleMsg(message, sender.tab.id);
    } else {
        console.log("Action not supported");
    }
}

function handleFilterListMsg(message) {
    var type = message.type;
    var url = message.url;
    var list;
    if (type == 'whitelist') {
        list = user.getWhitelist();
    } else if (type == 'blacklist') {
        list = user.getBlacklist();
    } else {
        return
    }
    m = list.create({
        'url' : url,
        'user' : user.getResourceURI(),
    });

    localStorage['user'] = JSON.stringify(user);
}

function handleIdleMsg(message, tabId) { 
    var type = message.type;
    if (type == 'openItem')  {
        openTab(tabId, 'focus');
    } else if (type == 'closeItem' && activeItem != undefined) { 
        closeTab(tabId, 'idle', function() {
                activeItem = undefined;
            });
    }
}

/*
    Posts data to server
*/
function dumpData() {
    var backlog = []
    var url = getApiURL('history-data');
    $.each(local_history, function(index, item){
        payload = serializePayload(item);
        $.ajax({
            type: 'POST',
            url: url,
            data: payload,
            dataType: "text",
            processData:  false,
            contentType: "application/json",
            error: function(jqXHR, textStatus, errorThrown){
                // log the error to the console
                console.log(
                    "The following error occured: "+
                    textStatus, errorThrown
                );
                backlog.push(item);
                if (index == local_history.length-1) {
                    local_history = backlog;
                }
            },
            success: function(data, textStatus, jqXHR) {
               if (index == local_history.length-1) {
                    local_history = [];
                } 
            },
        });
    });
}

/*
    checks if the time between the current event and the active item is greater than the delta. Default delta is 900ms
*/
function checkTimeDelta(delta) {
    var delta = delta || 900
    var now = new Date();
    var allow = true; // default to true allows active item to be set initially
    if (activeItem != undefined) { 
        allow = (now.getTime() - activeItem.start_time) > delta
    }

    return {
        'allow' : allow,
        'time' : now,
    }
}

function getApiURL(resource, id, params) {
    params = params || {};
    var apiBase = sprintf('%s/api/v1/%s', baseUrl, resource);
    var getParams = ''
    $.each(params, function(key, val){
        getParams += sprintf("&%s=%s", key, val);
    });
    if (id != null) {
        apiBase += '/' + id;
    } 
    return apiBase
    //return sprintf("%s/?format=json%s", apiBase, getParams)
}

/////////init models///////
function loadLocalHistory() {
    localString = localStorage['local_history'];
    localString = (localString) ? localString : "[]"; // catch undefined case
    return JSON.parse(localString);
}

/*
    Get and return the user from local storage.
    If no user is found create a new one.
    If an old user exists unJSON the object and return it.
*/
function getLocalStorageUser() {
    storedUser = localStorage.user;
    if (storedUser === "null") {
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

//  Check if these are already set to avoid overwriting.
function localSetIfNull(key, value) {
    if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, value);
    }
}

//converts the data to JSON serialized
function serializePayload(payload) {
    payload.start_time = payload.start_time
    payload.end_time = payload.end_time
    payload.user = user.getResourceURI();
    return JSON.stringify(payload);
}

// dictionary mapping all open items. Keyed on tabIds and containing all information to be written to the log. 
var activeItem;

local_history = loadLocalHistory();

user = getLocalStorageUser();
initBadge()

localSetIfNull("baseUrl", baseUrl);

