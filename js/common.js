"use strict";

/* note, always put `common.js` first when including scripts */

var HTTP_UNAUTHORIZED = 401;
var HTTP_OK = 200;
var CSRF_REGEX = /name\='csrfmiddlewaretoken' value\='.*'/; //regex to find the csrf token
var LOGGED_IN_REGEX = /var username \= ".*"/;
var baseUrl = "http://localhost:8000";

var PROMPT_TEMPLATE_CACHE = {};

///////////////////URL BUILDERS///////////////////
function getCSRFLoginUrl() {
    return baseUrl + "/accounts/login/";
}

function getLoginUrl() {
    return baseUrl + "/api/v1/auth/login/";
}

function getLogoutUrl() {
    return baseUrl + "/api/v1/auth/logout/";
}

function getUserUrl(username) {
    return baseUrl + "/users/" + username;
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
  build a url for retrieving/updating rating for the given inputs
*/

function getRatingUrl(method, params) {
    params = params || {};
    var apiBase = sprintf("%s/api/rating/%s", baseUrl, method);
    var getParams = "";
    for (var key in params) {
        getParams += sprintf("&%s=%s", key, params[key]);
    }

    if (getParams !== "") {
        apiBase += "?" + getParams.slice(1);
    }
    return apiBase;
}


/*
 * Given the response text of a webpage
 * try to parse the CSRF token out.
 */
function parseCSRFToken(data) {
    var match = data.match(CSRF_REGEX);
    if (match) {
        match = match[0];
        return match.slice(match.indexOf("value=") + 7, match.length - 1); // grab the csrf token
    } else {
        return null;
    }
}

/*
 * Given the repsonse text of a webpage
 * try to parse the username out
 */
function parseUsername(data) {
    var match = data.match(LOGGED_IN_REGEX);
    if (match) {
        match = match[0];
        var username = match.slice("var username = ".length + 1, match.length - 1);
        if (username === "") {
            return null;
        } else {
            return username;
        }
    } else {
        return null;
    }
}

function logErrors(jqXHR, textStatus, errorThrown) {
    console.log(jqXHR);
    console.log(textStatus);
    console.log(errorThrown);
}

/*
 * Parse urls
 * https://gist.github.com/jlong/2428561
 */
function getUrlParser(url) {
    var parser = document.createElement("a");
    parser.href = url;
    return parser;
}

function URI(url) {
    var parser = getUrlParser(url);
    this.protocol = parser.protocol; // => "http:"
    this.hostname = parser.hostname; // => "example.com"
    this.port = parser.port; // => "3000"
    this.pathname = parser.pathname; // => "/pathname/"
    this.search = parser.search; // => "?search=test"
    this.hash = parser.hash; // => "#hash"
    this.host = parser.host; // => "example.com:3000"
    parser.remove();
}

/////// TEMPLATING /////////////
function createMentionTag(data) {
    return data.replace(/(^|\W+)\@([\w\-]+)/gm, "$1<a href='" + baseUrl + "users/$2' target='_blank'>@$2</a>");
}

Object.size = function(obj) {
    var size = 0,
        key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }
    return size;
};

// List of HTML entities for escaping.
var unescapeMap = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#x27;": "'",
    "&#x60;": "`"
};

// Functions for escaping and unescaping strings to/from HTML interpolation.
var createEscaper = function(map) {
    var escaper = function(match) {
        return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = "(?:" + _.keys(map).join("|") + ")";
    var testRegexp = new RegExp(source);
    var replaceRegexp = new RegExp(source, "g");
    return function(string) {
        string = string === null ? "" : "" + string;
        return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
};

var _unescape = createEscaper(unescapeMap);

function initTemplates(templatePage, templateCache) {
    var url = chrome.extension.getURL("../html/" + templatePage);
    var templates = $($.ajax({
        type: "GET",
        url: url,
        dataType: "html",
        async: false
    }).responseText);
    for (var i = 0; i < templates.length; i++) {
        var el = $(templates[i]);
        var id = el.attr("id");
        if (id !== undefined) {
            templateCache["#" + id] = el;
        }
    }
}

function getPromptTemplate(templateId, templateArgs) {
    return getTemplate(templateId, templateArgs, "prompt.html", PROMPT_TEMPLATE_CACHE);
}

function getTemplate(templateId, templateArgs, templatePage, templateCache) {
    templateArgs = templateArgs || {};
    if (!Object.size(templateCache)) {
        initTemplates(templatePage, templateCache);
    }
    var template = _unescape(templateCache[templateId].html());
    return $(_.template(template, templateArgs));
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
      r: Math.min(parseInt(result[1], 16) + 30, 255),
      g: Math.min(parseInt(result[2], 16) + 30, 255),
      b: Math.min(parseInt(result[3], 16) + 30, 255)
  } : null;
}

function muteColor(colorString) {
  var rgbString = '';

  if (colorString) {
    var rgb = hexToRgb(colorString);
    rgbString = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
  }
  return rgbString;
}

function getHostName(url) {
    var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
    if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
        return match[2];
    }
    else {
        return null;
    }
}

function isInHighlightBlacklist(url) {
    for (let site of highlightBlacklist) {
        var re = new RegExp("^(?:http(?:s)?:\/\/)?(?:[^\.]+\.)?" + site + "\.com(?:.*)?$");
        if (re.test(url)) {
            console.log("BLOCKED! " + url);
            return true;
        }
    }

    return false;
}

// Pulled from Alexa 100
var highlightBlacklist = new Set([
    "facebook",
    "twitter",
    "medium",
    "gmail",
    "google",
    "messenger",
    "stackoverflow",
    "youtube",
    "baidu",
    "reddit",
    "amazon",
    "instagram",
    "live",
    "linkedin",
    "netflix",
    "imgur",
    "ebay",
    "bing",
    "pinterest",
    "github",
    "dropbox",
    "craigslist",
    "soundcloud",
    "spotify",
]);
