"use strict";

///////////Global vars/////////////
// global website base, set to localhost for testing, use deploy script to change
var siteName = "Eyebrowse";
var GOOGLE_FAVICON_URL = "http://www.google.com/s2/favicons?domain_url=";

// nag settings
// total time between nags
var NAG_TIME_THRESHOLD = 60 * 60 * 1000; // 1 hr in milliseconds
// number of visits per domain
var NAG_VISIT_THRESHOLD = 5;
// number of total visits before nagging
var NAG_TOTAL_VISIT_THRESHOLD = 15;

///////////////////models//////////////////////
// This object can represent either a whitelist or blacklist for a given user.
// On an update send results to server to update stored data. On intialization
// set is synced with server. Should allow offline syncing in the future.
var FilterListItem = Backbone.Model.extend({
    parse: function(data) {
        if (data !== null) {
            return {
                url: data.url,
                id: data.id,
            };
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
        return this.get("type");
    },

    url: function() {
        return getAPIUrl(this.type);
    },

    parse: function(data, res) {
        if (res.status === HTTP_OK) {
            return data.objects;
        }
    },

    // wrapper for fetch which logs user out if server errs
    _fetch: function() {
        this.fetch({
            error: _.bind(function(model, xhr, options) {
                user.attemptLogout(xhr);
            }, this)
        });
    },
});


/*
    User object holds the status of the user, the cookie from the server,
    preferences for eyebrowse, whitelist, blacklist, etc.
*/
var User = Backbone.Model.extend({
    defaults: {
        "loggedIn": false,
        "whitelist": new FilterList("whitelist"),
        "blacklist": new FilterList("blacklist"),
        "nags": {
            "visits": 0,
            "lastNag": (new Date()).getTime() - 24 * 360000
        },
        "username": "",
        "incognito": false,
        "resourceURI": "/api/v1/user/",
        "ignoreLoginPrompt": false,
        "csrf": "",
        "highlighting": true,
    },

    initialize: function() {
        // allow access to 'this' in callbacks with "this" meaning the object
        // not the context of the callback
        _.bindAll(this);
    },

    getIncognito: function() {
        return this.get("incognito");
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

    getHighlighting: function() {
        return this.get("highlighting");
    },

    attemptSetCSRF: function(data) {
        var csrf = parseCSRFToken(data);
        if (csrf !== null) {
            this.setCSRF(csrf);
        }
    },

    attemptLogin: function(callback) {
        if (callback !== undefined) {
            var this_user = this;
            $.get(getLoginUrl(), function(data) {
                this_user.attemptSetCSRF(data);
                callback(parseUsername(data));
            });
        } else {
            var data = $.ajax({
                type: "GET",
                url: getLoginUrl(),
                async: false
            }).responseText;
            var isLoggedIn = parseUsername(data) !== null ? true : false;
            this.attemptSetCSRF(data);
            return isLoggedIn;
        }
    },

    attemptLogout: function(jqXHR) {
        if (jqXHR.status === HTTP_UNAUTHORIZED) {
            user.logout();
        }
    },

    isLoggedIn: function() {
        if (this.getUsername() === this.defaults.username ||
            this.getResourceURI() === this.defaults.resourceURI) {
            this.logout();
        }
        return this.get("loggedIn");
    },

    ignoreLoginPrompt: function() {
        return this.get("ignoreLoginPrompt");
    },

    // when the user is logged in set the boolean to give logged in views.
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
        });
    },

    setLoginPrompt: function(bool) {
        this.set({
            "ignoreLoginPrompt": bool
        });
    },

    setNags: function(nags) {
        this.set({
            "nags": nags
        });
    },

    setHighlighting: function(bool) {
        this.set({
            "highlighting": bool
        });
    },

    // check if a url is in the blacklist
    inBlackList: function(url) {
        return this.inSet("blacklist", url);
    },

    // check if a url is in the whitelise
    inWhitelist: function(url) {
        return this.inSet("whitelist", url);
    },

    // defaults for a nag object
    createNagSite: function() {
        return {
            "visits": 1,
            "lastNag": (new Date()).getTime(),
            "factor": 1
        };
    },

    // we store hash keys as just the hostname..
    normalizeNagUrl: function(url) {
        url = url || "";
        if (url.indexOf("http") === -1) {
            // e.g. using login prompt as a key
            return url;
        }
        return new URI(url).hostname;
    },

    // sets exponential backoff factor
    setNagFactor: function(url, rate) {
        url = this.normalizeNagUrl(url);
        if (url !== "") {
            var nags = this.getNags();
            if (url in nags) {
                nags[url].factor = Math.max(Math.min(nags[url].factor * rate, 16), 1);
            } else {
                nags[url] = this.createNagSite();
            }

            this.setNags(nags);
        }
    },

    // check if a url should be nagged
    shouldNag: function(url) {
        url = this.normalizeNagUrl(url);
        var nags = this.getNags();

        var overallVisits = nags.visits;
        var overallLastNag = nags.lastNag;

        var _shouldNag = false;
        var now = (new Date()).getTime();
        var site, visits, lastNag, factor;

        if (overallVisits >= NAG_TOTAL_VISIT_THRESHOLD || now - overallLastNag > NAG_TIME_THRESHOLD) {
            if (url in nags) {
                site = nags[url];
                visits = site.visits;
                lastNag = site.lastNag;
                factor = site.factor;

                if (visits >= NAG_VISIT_THRESHOLD * factor || now - lastNag > NAG_TIME_THRESHOLD * factor) {
                    _shouldNag = true;
                    site.visits = 0;
                    site.lastNag = now;

                    nags.visits = 0;
                    nags.lastNag = now;
                } else {
                    site.visits++;
                    nags.visits++;
                }
            } else {
                _shouldNag = true;
                nags.lastNag = now;
                nags.visits = 0;
                nags[url] = this.createNagSite();
            }
        } else {
            nags.visits++;
            if (url in nags) {
                site = nags[url];
                site.visits++;
            } else {
                nags[url] = {
                    "visits": 1,
                    "lastNag": now - 24 * NAG_TIME_THRESHOLD,
                    "factor": 1
                };
            }
        }
        this.setNags(nags);

        return _shouldNag;
    },

    // check if url is in a set (either whitelist or blacklist)
    // documentation for URL.js : http://medialize.github.com/URI.js/docs.html
    inSet: function(setType, url) {
        var set = this.get(setType);
        var uri = new URI(url);
        var hostname = uri.hostname;
        var protocol = uri.protocol;
        var port = uri.port;
        if (port) {
            port = ":" + port;
        }
        return (set.where({
            "url": hostname
        }).length || set.where({
            "url": protocol + "://" + hostname + port
        }).length || set.where({
            "url": url
        }).length);
    },

    // save the current state to local storage
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
    if (!user.isLoggedIn()) {
        if (user.attemptLogin()) {
            user.login();
        } else {
            if (!user.ignoreLoginPrompt() && user.shouldNag("loginPrompt")) {
                chrome.tabs.sendMessage(tabId, {
                    "action": "prompt",
                    "type": "loginPrompt",
                    "baseUrl": baseUrl,
                });
            }
            return;
        }
    }
    var timeCheck = checkTimeDelta();

    // if its not in the whitelist lets check that the user has it
    setTimeout(function() {
        bubbleInfo(tabId, url);
    }, 3000);

    if (user.getIncognito() === false) {

        // close previous activeItem
        if (activeItem !== undefined) {
            if (activeItem.url !== url || activeItem.tabId !== tabId) {
                closeItem(activeItem.tabId, activeItem.url, "blur", timeCheck.time);
                activeItem = undefined;
                updateBadge("");
            } else if (activeItem.url === url) {
                // page was refreshed
                return;
            }
        }
        if (!user.inWhitelist(url) && !user.inBlackList(url) && user.shouldNag(url)) {
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

        } else if (user.inBlackList(url)) {
            updateBadge("");
            return;
        }

        // open new activeItem
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

    // checkForUsers(url);

}

function bubbleInfo(tabId, url) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabArray) {
        if (isActiveTab(tabArray, tabId)) {
            chrome.tabs.sendMessage(tabId, {
                "action": "prompt",
                "type": "bubbleInfo",
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
    if (activeItem === undefined) {
        return;
    }
    if (user.getIncognito() === true) {
        return;
    }

    time = time || new Date(); // time is undefined for destroy event

    var total_time = time - activeItem.start_time;

    if (activeItem.tabId === tabId && !user.inBlackList(url) && total_time > 5000) {
        // write to local storage
        var item = $.extend({}, activeItem); // copy activeItem

        item.end_event = event_type;
        item.end_time = time;
        item.total_time = total_time;
        item.humanize_time = moment.humanizeDuration(item.total_time);
        local_history.push(item);

        //  send data for server and sync whitelist/blacklist
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
    delta = delta || 900;
    var now = new Date();
    var allow = true; // default to true allows active item to be set initially
    if (activeItem !== undefined) {
        allow = (now.getTime() - activeItem.start_time) > delta;
    }

    return {
        "allow": allow,
        "time": now,
    };
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
    user.setNagFactor(url, 0.5);

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

    list.create({
        "url": uri.hostname,
        "port": uri.port,
        "user": user.getResourceURI(),
    });

    localStorage.user = JSON.stringify(user);
}

/*
    close an item if the tab is idle
*/
function handleIdleMsg(msg, tabId) {
    var type = msg.type;
    if (type === "openItem") {
        openTab(tabId, "focus");
    } else if (type === "closeItem" && activeItem !== undefined) {
        closeTab(tabId, "idle", function() {
            activeItem = undefined;
        });
    }
}

/*
    Open the popup so the user can logback in again
*/
function handleLoginMsg() {
    openLink(chrome.extension.getURL("html/popup.html"));
}

/*
    Set the nag factor for exponential backoff
*/
function handleNagMsg(url) {
    user.setNagFactor(url, 2);
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

    var users = parsed.result.page;
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

            if (isActiveTab(tabArray, tabId) && activeItem !== undefined) {

                var end_time = new Date();
                var total_time = end_time - activeItem.start_time;

                if (total_time > 5000) {
                    var url = getAPIUrl("history-data");

                    var item = $.extend({}, activeItem); //copy activeItem
                    item.end_event = "";
                    item.end_time = end_time;
                    item.total_time = total_time;
                    item.humanize_time = moment.humanizeDuration(item.total_time);

                    var payload = serializePayload(item);

                    $.ajax({
                        type: "POST",
                        url: url,
                        data: payload,
                        dataType: "text",
                        processData: false,
                        contentType: "application/json",
                        error: function(jqXHR, textStatus, errorThrown) {
                            logErrors(jqXHR, textStatus, errorThrown);
                            user.attemptLogout(jqXHR);
                        },
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
    var backlog = [];
    var url = getAPIUrl("history-data");
    var stop = false;
    $.each(local_history, function(index, item) {
        //stop sending on error
        if (stop) {
            return;
        }
        var payload = serializePayload(item);
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
                logErrors(jqXHR, textStatus, errorThrown);
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
        local_history.splice(index, 1); // remove item from history
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

function getFavIconUrl(favIconUrl, url) {
    if (!favIconUrl || !favIconUrl.length) {
        favIconUrl = GOOGLE_FAVICON_URL + url;
    }
    return favIconUrl;
}

// http://stackoverflow.com/questions/6150289/how-to-convert-image-into-base64-string-using-javascript
/**
 * Convert an image
 * to a base64 url
 * @param  {String}   url
 * @param  {Function} callback
 * @param  {String}   [outputFormat=image/png]
 */
function convertImgToBase64URL(url, callback, outputFormat) {
    var canvas = document.createElement("CANVAS"),
        ctx = canvas.getContext("2d"),
        img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function() {
        var dataURL;
        canvas.height = img.height;
        canvas.width = img.width;
        ctx.drawImage(img, 0, 0);
        dataURL = canvas.toDataURL(outputFormat);
        callback(dataURL);
        canvas = null;
    };
    img.src = url;
}

/*
    build an API url for the given inputs
*/
function getAPIUrl(resource, id, params) {
    params = params || {};
    var apiBase = sprintf("%s/api/v1/%s", baseUrl, resource);
    var getParams = "";
    for (var key in params) {
        getParams += sprintf("&%s=%s", key, params[key]);
    }

    if (getParams !== "") {
        apiBase += "?" + getParams.slice(1);
    }
    if (id !== undefined) {
        apiBase += "/" + id;
    }
    return apiBase;
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
    var localString = localStorage.local_history;
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

        $.get(getLoginUrl(), function(data) {
            var csrf = parseCSRFToken(data);
            if (csrf) {
                user.setCSRF(csrf);
                localStorage.user = JSON.stringify(user);
            }
        });

        localStorage.user = JSON.stringify(user); // store user
        return user;
    }

    var o = JSON.parse(storedUser);
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
    localStorage.removeItem("local_history");
    local_history = [];
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
    // green
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
    if (e === "logout") {
        updateBadge("!");
    } else if (e === "login") {
        updateBadge("");
    }
}

/*
    initialize the badge with login flag
*/
function initBadge() {
    if (!user.isLoggedIn()) {
        loginBadge("logout");
    }
}

/*
 * Return the active tab if it is valid
 */
function getActiveTab(tabArray) {
    if (tabArray[0] === undefined) {
        return null;
    }
    return tabArray[0];
}

/*
 * Check if the active tab matches the given tabId
 */
function isActiveTab(tabArray, tabId) {
    var activeTab = getActiveTab(tabArray);
    return activeTab !== null && activeTab.id === tabId;
}

// dictionary mapping all open items. Keyed on tabIds and containing all
// information to be written to the log.
var activeItem;
var tmpItem;

var local_history = loadLocalHistory();

var user = getLocalStorageUser();
initBadge();

localStorage.setItem("baseUrl", baseUrl);
