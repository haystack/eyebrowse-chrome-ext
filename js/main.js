///////////Models//////////////

//This object can represent either a whitelist or blacklist for a given user. On an update send results to server to update stored data. On intialization set is synced with server. Should allow offline syncing in the future.
var FilterSet = Backbone.Model.extend({
    
    defaults : {
        'set' : {},
        'type' : ''
    },

    initialize : function() {
        _.bindAll(this); //allow access to 'this' in callbacks with 'this' meaning the object not the context of the callback
        this.syncSet();
    },

    getType : function() {
        return this.get('type')
    },

    getSet : function() {
        return this.get('set')
    },

    getItem : function(item) {
        return this.getSet()[item]
    },

    syncSet : function() {
        return
        var payload = {
            'type' : this.getType(),
        };
        var url = this.urlSync();
        /* 
            we send the server the type of set we want to sync and reset our set to be what the server has. This allows access across computers/entensions
        */
        $.post(url, payload, function(res){
            if (res.success) {     
                this.set({
                    'set' : res.set,
                });
            }
        });
    },

    addItem : function(item) {
        var set = this.getSet();
        set[item] = item;

        var payload = {
            'type' : this.getType(),
            'action' : 'add',
            'item': item,
        }
        this.updateSet(payload);
    },

    rmItem : function(item) {
        var set = this.getSet();
        delete set[item];
        var payload = {
            'type' : this.getType(),
            'action' : 'rm',
            'item': item,
        }
        this.updateSet(payload);
    },

    updateSet : function(payload) {
        return //tmp for dev
        var url = this.urlUpdateSet();
        $.post(url, payload, function(res) {
            return this.res.success //return true or false maybe we have a gui update here.
        });
    },

    urlSync : function() {
        return baseUrl //+ todo 
    },

    urlUpdateSet : function() {
        return baseUrl // + todo
    },
});


//User object holds the status of the user, the cookie from the server, preferences for eyebrowse, whitelist, blacklist, etc
var User = Backbone.Model.extend({
    defaults: {
        'loggedIn' : false,
        'whitelist' : new FilterSet({
            'type' : 'whitelist',
        }),  // for dev lets use a blacklist since its easier to exclude only a few 
        'blacklist' : new FilterSet({
            'type' : 'blacklist',
        }),
    },
    initialize : function() {
        _.bindAll(this); //allow access to 'this' in callbacks with 'this' meaning the object not the context of the callback
        /*
            debug is a dictionary of the following form:
            debug = {
                whitelist : [url1, url2, ...],
                blacklist : [url1, url2, ...]
            }
            This allows for debugging of whitelist/blacklist functionality
        */
        var debug = this.get('debug'); 
        if (debug != undefined) {
            this.initDefaults(debug);
        }
    },

    //set the default whitelist and blacklist values
    initDefaults : function(debug) {
        var whitelist = this.getWhitelist();
        var blacklist = this.getBlackList();
        $.each(debug.whitelist, function(index, item) {
            whitelist.addItem(item);
        });
        $.each(debug.blacklist, function(index, item) {
            blacklist.addItem(item);
        });
    },

    getWhitelist : function() {
        return this.get('whitelist')
    },

    getBlackList : function() {
        return this.get('blacklist')
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
        return (set.getItem(hostname) != undefined || set.getItem(protocol) != undefined)
    },

    //type is whitelist or blacklist which calls update method on FilterSet object
    updateSet : function(listType, item, action) {
         if (action == 'add') {
            this.get(listType).addItem(item);
        } else if (action == 'rm') {
            this.get(listType).rmItem(item);
        }
    },
});

/*
    inputs:
    tabId - indentifer of tab (unique to session only)
    url - url of the tab making the request
    title - title of the webpage the tab is displaying
    event_type - whether a tab is opening or closing/navigating to a new page etc
*/
function open_item(tabId, url, faviconUrl, title, event_type) {

    var timeCheck = checkTimeDelta();
    //if event type is focus we need to close out the current tab
    if(!user.inBlackList(url) && timeCheck.allow) {
        if (event_type === "focus" && active_item != undefined) {
            close_item(active_item.tabId, 'blur', timeCheck.time);
        }
        
        //reassign the active item to be the current tab
        active_item = {
            'tabId' : tabId,
            'url' : url,
            'faviconUrl' : faviconUrl,
            'title' : title,
            'start_event' : event_type,
            'start_time' : new Date().getTime(), // milliseconds
        };

        open_items.push(active_item); // tmp for dev/testing
        update_badge();
    }
}


local_storage = [] //tmp tmp tmp //http://stackoverflow.com/questions/2153070/do-chrome-extensions-have-access-to-local-storage
/* 
    There is only ever one active_item at a time so only close out the active one. 
    This event will be fired when a tab is closed or unfocused but we would have already 'closed' the item so we don't want to do it again.
*/
function close_item(tabId, url, event_type, time) {
    var time = time || new Date().getTime(); // time is indefined for destroy event

    if (active_item.tabId === tabId && !user.inBlackList(url)) {
        //write to local storage
        var item = $.extend({}, active_item); //copy active_item

        item.end_event = event_type;
        item.end_time = time;
        item.tot_time = item.start_time - item.end_time;
        local_storage.push(item);
    }
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
    console.log({
        'allow' : allow,
        'time' : now,
    });
    return {
        'allow' : allow,
        'time' : now,
    }
}


///////////Global vars/////////////
var baseUrl = "http://localhost:8000" // global website base, set to localhost for testing
//var baseUrl = "http://eyebrowse.herokuapp.com"

/////////init models///////
var user = new User({
    'debug' : {
        'whitelist' : [],
        'blacklist' : ['chrome', 'chrome-devtools'],
    }
});

// dictionary mapping all open items. Keyed on tabIds and containing all information to be written to the log. 
open_items = [];
var active_item;
open_items_dict = {};