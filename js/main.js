///////////Global vars/////////////
var baseUrl = "http://localhost:5000"; 

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
    parse: function(data){
        return data.objects;
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
        return this.get('loggedIn')
    },

    //when the user is logged in set the boolean to give logged in views.
    setLogin : function(status) {
        this.set({ 
            'loggedIn': status,
        });
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
        return (set.where({'url' : hostname}).length != 0 || set.where({"url" : protocol}).length != 0 || set.where(url).length != 0)
    },
});


/*
    inputs:
    tabId - indentifer of tab (unique to session only)
    url - url of the tab making the request
    favIconUrl - used for displaying content
    title - title of the webpage the tab is displaying
    event_type - whether a tab is opening or closing/navigating to a new page etc
*/
function open_item(tabId, url, favIconUrl, title, event_type) {
    console.log(favIconUrl)
    var timeCheck = checkTimeDelta();
    var uri = new URI(url);
    //if its not in the whitelist lets check that the user has it
    if (!user.inWhitelist(url) && !user.inBlackList(url)) {
        console.log("NEIGHTER LIST");
        var list = true ? user.getWhitelist() : user.getBlacklist(); // setup user confirmation
        list.create({
                'url' : uri.hostname(),
                'user' : user.getResourceURI(),
            })
        if (list.getType() === 'blacklist'){
            return
        }
    } else if (user.inBlackList(url)) {
        return
    }

    //if event type is focus we need to close out the current tab
    if (timeCheck.allow) {
        if (event_type === "focus" && active_item != undefined) {
            close_item(active_item.tabId, active_item.url, 'blur', timeCheck.time);
        };
    };
        
    //reassign the active item to be the current tab
    active_item = {
        'tabId' : tabId,
        'url' : url,
        'favIconUrl' : favIconUrl,
        'title' : title,
        'start_event' : event_type,
        'start_time' : new Date(),
    };
}

/* 
    There is only ever one active_item at a time so only close out the active one. 
    This event will be fired when a tab is closed or unfocused but we would have already 'closed' the item so we don't want to do it again.
*/
function close_item(tabId, url, event_type, time) {
    var time = time || new Date(); // time is undefined for destroy event
    if (active_item.tabId === tabId && !user.inBlackList(url)) {
        //write to local storage
        var item = $.extend({}, active_item); //copy active_item

        item.end_event = event_type;
        item.end_time = time;
        item.total_time = item.end_time - item.start_time;
        item.humanize_time = moment.humanizeDuration(item.total_time);
        local_storage.push(item);
        update_badge();
    }
}


/*
    Posts data to server
*/
function dump_data() {
    var url = getApiURL('history-data');
    $.each(local_storage, function(index, item){
        payload = serializePayload(item);
        $.ajax({
            type: 'POST',
            url: url,
            data: payload,
            dataType: "application/json",
            processData:  false,
            contentType: "application/json"
        });
    });
}

/*
    checks if the time between the current event and the active item is greater than the delta. Default delta is 900ms
*/
function checkTimeDelta(delta) {
    var delta = delta || 900
    var now = new Date().getTime();
    var allow = true; // default to true allows active item to be set initially
    if (active_item != undefined) { 
        allow = (now - active_item.start_time) > delta
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
    localString = localStorage['local_storage'];
    localString = (localString) ? localString : "[]"; // catch undefined case
    return JSON.parse(localString);
}

//  Check if these are already set to avoid overwriting.
function localSetIfNull(key,value) {
    if (localStorage.getItem(key) === null) {
        console.log(key + " not set. Setting now to " + value);
        localStorage.setItem(key,value);
    } else {
        console.log(key + " already set. Leaving it alone. Value is " + localStorage.getItem(key));
    }
}

//convets the data to JSON serialized
function serializePayload(payload) {
    payload.start_time = moment(payload.start_time).toString()
    payload.end_time = moment(payload.end_time).toString()
    payload.user = user.getResourceURI();
    return JSON.stringify(payload);
}

//tmp for dev
function update_badge() {

    chrome.browserAction.setBadgeText(
        {
            text: String(local_storage.length + 1)
        });
}




// global website base, set to localhost for testing
//var baseUrl = "http://eyebrowse.herokuapp.com"

// dictionary mapping all open items. Keyed on tabIds and containing all information to be written to the log. 
var active_item;

local_storage = loadLocalHistory();

user = new User();

localSetIfNull("baseUrl", baseUrl);

