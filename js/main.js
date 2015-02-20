///////////Global vars/////////////
// global website base, set to localhost for testing, use deploy script to change
var baseUrl = "http://localhost:8000";
var siteName = "Eyebrowse";

///////////////////models//////////////////////


//This object can represent either a whitelist or blacklist for a given user. On an update send results to server to update stored data. On intialization set is synced with server. Should allow offline syncing in the future.
var FilterListItem = Backbone.Model.extend({
    parse: function(data) {
        if (data !== null) {
            return {
                url: data.url,
                id: data.id,
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

    getType: function() {
        return this.get("type")
    },

    url: function() {
        return getApiURL(this.type)
    },

    parse: function(data, res) {
        if (res.status === 200) {
            return data.objects;
        }
    },

    //wrapper for fetch which logs user out if server errs
    _fetch: function() {
        this.fetch({
            error: _.bind(function(model, xhr, options) {
                //DO NOT LOG OUT IF SERVER ERRORS
                // if (typeof user !== "undefined" && navigator.onLine){
                //user.logout();   
                // }
            }, this)
        });
    },
});


/*
    User object holds the status of the user, the cookie from the server, preferences for eyebrowse, whitelist, blacklist, etc.
*/
var User = Backbone.Model.extend({
    defaults: {
        "loggedIn": false,
        "whitelist": new FilterList("whitelist"),
        "blacklist": new FilterList("blacklist"),
        "nags": {
            "visits": 11,
            "lastNag": (new Date()).getTime() - 24 * 360000
        },
        "username": "",
        "incognito": false,
        "resourceURI": "/api/v1/user/",
        "ignoreLoginPrompt": false,
        "csrf": "",
    },

    initialize: function() {
        _.bindAll(this); //allow access to 'this' in callbacks with "this" meaning the object not the context of the callback

    },

    getIncognito: function() {
        return this.get("incognito")
    },

    setIncognito: function(val) {
        this.set({
            "incognito": val,
        });
    },


    getWhitelist: function() {
        return this.get("whitelist");
    },

    getBlacklist: function() {
        return this.get("blacklist");
    },

    getNags: function() {
        return this.get("nags");
    },

    getUsername: function() {
        return this.get("username");
    },
    
    getCSRF: function() {
        return this.get("csrf");
    },


    getResourceURI: function() {
        return this.get("resourceURI");
    },
    
    checkLoggedIn: function() {		     
		var data = $.parseJSON(
						$.ajax(baseUrl + "/ext/loggedIn", {
					       type: "GET",
					       dataType: "json",
					       async: false
			    	}).responseText);
         if (data.res) {
         	this.setUsername(data.username);
         	this.login();
         	return true;
         } else {
         	if (this.isLoggedIn()) {
         		this.logout();
         		this.setLoginPrompt(false);
         	}
         	else {
         		this.logout();
         	}
         	return false;
         }
    },

    isLoggedIn: function() {	     
		if (this.getUsername() === this.defaults.username || this.getResourceURI() === this.defaults.resourceURI) {
            this.logout();
        }
        return this.get("loggedIn");
    },

    ignoreLoginPrompt: function() {
        return this.get("ignoreLoginPrompt");
    },

    //when the user is logged in set the boolean to give logged in views.
    setLogin: function(status) {
        this.set({
            "loggedIn": status,
        });

        var map = {
            "true": "login",
            "false": "logout"
        };

        loginBadge(map[status]);
    },

    login: function() {
        this.setLogin(true);
        this.setLoginPrompt(false);
    },

    logout: function() {
        this.setLogin(false);
    },

    setUsername: function(username) {
        this.set({
            "username": username,
        });
        this.setResourceURI(username);
    },
    
    setCSRF: function(csrf) {
        this.set({
            "csrf": csrf,
        });
    },

    setResourceURI: function(username) {
        this.set({
            "resourceURI": sprintf("/api/v1/user/%s/", username)
        });
    },

    setWhitelist: function(whitelist) {
        this.setFilterSet("whitelist", whitelist);
    },

    setBlacklist: function(blacklist) {
        this.setFilterSet("blacklist", blacklist);
    },

    setFilterSet: function(type, list) {
        this.set({
            type: list
        })
    },

    setLoginPrompt: function(bool) {
        this.set({
            "ignoreLoginPrompt": bool
        });
    },

    //check if a url is in the blacklist
    inBlackList: function(url) {
        return this.inSet("blacklist", url)
    },

    //check if a url is in the whitelise
    inWhitelist: function(url) {
        return this.inSet("whitelist", url)
    },

    //sets exponential backoff factor
    setNagFactor: function(url, rate) {
        if (url != "") {
            var nags = this.getNags()
            var site = nags[url]
            var visits = site["visits"]
            var lastNag = site["lastNag"]
            var factor = site["factor"]

            var newSite = {
                "visits": visits,
                "lastNag": lastNag,
                "factor": Math.max(Math.min(factor * rate, 16), 1)
            }
            nags[url] = newSite

            this.set({
                "nags": nags,
            });
        }
    },

    //check if a url should be nagged
    shouldNag: function(url) {
        var timeThres = 3600000 //1 hour in milliseconds
        var visitThres = 5

        var overallThres = 10

        var nags = this.getNags()

        var overallVisits = nags["visits"]
        var overallLastNag = nags["lastNag"]

        var b_Nag = false
        var now = (new Date()).getTime()
        if (overallVisits >= overallThres || now - overallLastNag > timeThres) {
            var newSite = undefined
            if (url in nags) {
                var site = nags[url]
                var visits = site["visits"]
                var lastNag = site["lastNag"]
                var factor = site["factor"]

                if (visits >= visitThres * factor || now - lastNag > timeThres * factor) {
                    b_Nag = true
                    newSite = {
                        "visits": 0,
                        "lastNag": now,
                        "factor": factor
                    }
                    nags["visits"] = 0
                    nags["lastNag"] = now
                } else {
                    newSite = {
                        "visits": visits + 1,
                        "lastNag": lastNag,
                        "factor": factor
                    }
                    nags["visits"]++
                }
            } else {
                b_Nag = true
                newSite = {
                    "visits": 1,
                    "lastNag": now,
                    "factor": 1
                }
                nags["lastNag"] = now
                nags["visits"] = 0
            }
            nags[url] = newSite
        } else {
            nags["visits"]++
            var newSite = undefined
            if (url in nags) {
                var site = nags[url]
                var visits = site["visits"]
                var lastNag = site["lastNag"]
                var factor = site["factor"]

                newSite = {
                    "visits": visits + 1,
                    "lastNag": lastNag,
                    "factor": factor
                }
            } else {
                newSite = {
                    "visits": 1,
                    "lastNag": now - 24 * timeThres,
                    "factor": 1
                }
            }
            nags[url] = newSite
        }
        this.set({
            "nags": nags,
        });

       return b_Nag;
    },

    //check if url is in a set (either whitelist or blacklist)
    // documentation for URL.js : http://medialize.github.com/URI.js/docs.html
    inSet: function(setType, url) {
        var set = this.get(setType);
        var uri = new URI(url);
        var hostname = uri.hostname();
        var protocol = uri.protocol();
        return (set.where({
            "url": hostname
        }).length || set.where({
            "url": protocol + '://' + hostname
        }).length || set.where({
            "url": url
        }).length);
    },

    //save the current state to local storage
    saveState: function() {
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
    if (!user.checkLoggedIn()) {
        if (!user.ignoreLoginPrompt()) {
            chrome.tabs.sendMessage(tabId, {
                "action": "prompt",
                "type": "loginPrompt",
                "baseUrl": baseUrl,
            });
        }
        return;
    }
    var timeCheck = checkTimeDelta();
    var uri = new URI(url);
    //if its not in the whitelist lets check that the user has it

    setTimeout(function() {
        popupInfo(tabId, url);
    }, 3000);


    if (user.getIncognito() == false) {

        //close previous activeItem
        if (activeItem !== undefined) {
            if (activeItem.url !== url && activeItem.tabId !== tabId) {
                closeItem(activeItem.tabId, activeItem.url, "blur", timeCheck.time);
                activeItem = undefined;
                updateBadge("");
            }
        }

        //check to nag
        if (!user.inWhitelist(uri.hostname()) && !user.inBlackList(uri.hostname()) && user.shouldNag(uri.hostname())) {
            timeCheck.allow = false; // we need to wait for prompt callback
            chrome.tabs.sendMessage(tabId, {
                "action": "prompt",
                "type": "trackPrompt",
                "baseUrl": baseUrl,
            });
            tmpItem = {
                "tabId": tabId,
                "url": url,
                "favIconUrl": favIconUrl,
                "title": title,
                "event_type": event_type,
            };
            updateBadge("");

        } else if (user.inBlackList(uri.hostname())) {
            updateBadge("");
            return;
        }

        //open new activeItem
        if (user.inWhitelist(url)) {
            if (timeCheck.allow) {
                finishOpen(tabId, url, favIconUrl, title, event_type, timeCheck.time);
            }
            trackBadge();
        } else {
            updateBadge("");
        }
    } else {
        updateBadge("");
    }

    //checkForUsers(url);

}

function popupInfo(tabId, url) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(arrayOfTabs) {
        activeTabId = arrayOfTabs[0].id;
        if (activeTabId === tabId) {
            chrome.tabs.sendMessage(tabId, {
                "action": "prompt",
                "type": "getInfo",
                "baseUrl": baseUrl,
                "user": user,
            });
        }
    });
}


/*
    change the active item state of an item.
    called after a prompt is allowed or timecheck passes
*/
function finishOpen(tabId, url, favIconUrl, title, event_type, time) {
	
    activeItem = {
        "tabId": tabId,
        "url": url,
        "favIconUrl": favIconUrl,
        "title": title,
        "start_event": event_type,
        "start_time": new Date(),
    };
    setTimeout(function() {
        sendInitialData(tabId);
    }, 5000);

}

/* 
    There is only ever one activeItem at a time so only close out the active one. 
    This event will be fired when a tab is closed or unfocused but we would have 
    already "closed" the item so we don"t want to do it again.
*/
function closeItem(tabId, url, event_type, time) {
    if (activeItem === undefined) return;
    if (user.getIncognito() === true) return;

    var time = time || new Date(); // time is undefined for destroy event

    var total_time = time - activeItem.start_time;

    if (activeItem.tabId === tabId && !user.inBlackList(url) && total_time > 5000) {
        //write to local storage
        var item = $.extend({}, activeItem); //copy activeItem

        item.end_event = event_type;
        item.end_time = time;
        item.total_time = total_time;
        item.humanize_time = moment.humanizeDuration(item.total_time);
        local_history.push(item);

        // send data for server and sync whitelist/blacklist
        if (local_history.length) {
            dumpData();
            user.getWhitelist()._fetch();
            user.getBlacklist()._fetch();
        }
        activeItem = undefined;

    } else {
        activeItem = undefined;
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
        "allow": allow,
        "time": now,
    }
}


///////////////message handlers///////////////
/*
    create a whitelist or blacklist item when the message comes in from the prompt
*/
function handleFilterListMsg(msg) {
    var type = msg.type;
    var url = msg.url;
    var list;
    
    var uri = new URI(url);
    user.setNagFactor(uri.hostname(), .5);
    
    if (type === "whitelist") {
        list = user.getWhitelist();
        if (tmpItem !== null) {
            var now = new Date();
            finishOpen(tmpItem.tabId, tmpItem.url, tmpItem.favIconUrl, tmpItem.title, tmpItem.event_type, now);
            trackBadge();
            tmpItem = null;
        }
    } else if (type === "blacklist") {
        list = user.getBlacklist();
    } else {
        return;
    }

    m = list.create({
        "url": uri.hostname(),
        "user": user.getResourceURI(),
    });

    localStorage.user = JSON.stringify(user);
}

/*
    close an item if the tab is idle
*/
function handleIdleMsg(msg, tabId) {
    var type = msg.type;
    if (type == "openItem") {
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
function handleLoginMsg() {
    openLink(chrome.extension.getURL('html/popup.html'));
}

/*
    Set the nag factor for exponential backoff
*/
function handleNagMsg(url) {
    user.setNagFactor((new URI(url)).hostname(), 2);
}

/*
    Store the ignore state so the popup message does not display
*/
function handleIgnoreMsg() {
    user.setLoginPrompt(true);
}

///////////////////server comm utils///////////////////


/*
	Get active users from server
*/
function checkForUsers(url) {
    var encoded_url = encodeURIComponent(url);
    var req_url = sprintf("%s/ext/getActiveUsers?url=%s", baseUrl, encoded_url);
    var text = $.ajax({
        type: "GET",
        url: req_url,
        dataType: "json",
        async: false
    }).responseText;

    var parsed = JSON.parse(text);

    var users = parsed["result"]['page'];
    var count = users.length;
    if (count > 0) {
        updateBadge(count.toString());
        chrome.browserAction.setBadgeBackgroundColor({
            "color": "#0000ff"
        });
    }
}



/*
    Send initial data to server
*/
function sendInitialData(tabId) {

    chrome.tabs.query({
            currentWindow: true,
            active: true
        },
        function(tabArray) {
            var active = tabArray[0];

            if (tabId === active.id) {

                var end_time = new Date();
                var total_time = end_time - activeItem.start_time;

                if (total_time > 5000) {
                    var url = getApiURL("history-data");

                    var item = $.extend({}, activeItem); //copy activeItem
                    item.end_event = '';
                    item.end_time = end_time;
                    item.total_time = total_time;
                    item.humanize_time = moment.humanizeDuration(item.total_time);

                    payload = serializePayload(item);

                    $.ajax({
                        type: "POST",
                        url: url,
                        data: payload,
                        dataType: "text",
                        processData: false,
                        contentType: "application/json",
                        error: function(jqXHR, textStatus, errorThrown) {},
                        success: function(data, textStatus, jqXHR) {},
                    });
                }
            }

        }
    );
}


/*
    Posts data to server
*/
function dumpData() {
    var backlog = []
    var url = getApiURL("history-data");
    var stop = false;
    $.each(local_history, function(index, item) {
        if (stop) return; //stop sending on error
        payload = serializePayload(item);
        var that = this;
        $.ajax({
            type: "POST",
            url: url,
            data: payload,
            dataType: "text",
            processData: false,
            contentType: "application/json",
            error: function(jqXHR, textStatus, errorThrown) {
                stop = true;
                // if (navigator.onLine){
                //     user.logout(); //notify user of server error
                // }
            },
            success: function(data, textStatus, jqXHR) {
                local_history.splice(index, 1); //remove item from history on success 
            },
        });
    });
}

/*
    Empty data
*/
function emptyData() {
    $.each(local_history, function(index, item) {
        local_history.splice(index, 1); //remove item from history
    });
}


/*
    converts the data to JSON serialized
*/
function serializePayload(payload) {
    payload.user = user.getResourceURI();
    payload.src = "chrome";
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
    chrome.tabs.create({
        "url": url
    });
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

	    $.get(baseUrl + "/accounts/login/", function(data) {
	         var REGEX = /name\='csrfmiddlewaretoken' value\='.*'/; //regex to find the csrf token
	         var match = data.match(REGEX);
	         if (match) {
	        		match = match[0];
	        		var csrfmiddlewaretoken = match.slice(match.indexOf("value=") + 7, match.length - 1); // grab the csrf token
	        		user.setCSRF(csrfmiddlewaretoken);
	        		localStorage.user = JSON.stringify(user);
	        }});

        localStorage.user = JSON.stringify(user); //store user
        return user;
    }

    o = JSON.parse(storedUser);
    var u = new User();

    u.setUsername(o.username);
    u.setCSRF(o.csrf);
    u.setLogin(o.loggedIn);
    if (o.loggedIn) {
        //if the user is logged in don't ignore the prompt
        u.setLoginPrompt(false);
    }
    u.setBlacklist(o.blacklist);
    u.setWhitelist(o.whitelist);

    return u;
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
function clearStorage() {
    localStorage.removeItem("local_history")
    local_history = []
}

//////////////////badge utils////////////////////


/*
    wraps the chrome badge update function
*/
function updateBadge(text) {
    chrome.browserAction.setBadgeText({
        "text": text
    });
}

/*
    helper to generate a badge on tracked sites

*/
function trackBadge() {
    updateBadge("\u2713");
    //green
    chrome.browserAction.setBadgeBackgroundColor({
        "color": "#50ba6a"
    });
}
/*
    clear login flag
*/
function loginBadge(e) {
    chrome.browserAction.setBadgeBackgroundColor({
        "color": "#cd5c5c"
    });
    if (e == "logout") {
        updateBadge("!");
    } else if (e == "login") {
        updateBadge("");
    }
}

/*
    initialize the badge with login flag
*/
function initBadge() {
    if (!user.checkLoggedIn()) {
        loginBadge("logout");
    }
}

// dictionary mapping all open items. Keyed on tabIds and containing all information to be written to the log. 
var activeItem;
var tmpItem;

local_history = loadLocalHistory();

user = getLocalStorageUser();
initBadge()

localStorage.setItem("baseUrl", baseUrl);
