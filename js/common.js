"use strict";

/* note, always put `common.js` first when including scripts */

var HTTP_UNAUTHORIZED = 401;
var HTTP_OK = 200;
var CSRF_REGEX = /name\='csrfmiddlewaretoken' value\='.*'/; //regex to find the csrf token
var LOGGED_IN_REGEX = /var username \= ".*"/;
var baseUrl = "http://localhost:8000";

var PROMPT_TEMPLATE_CACHE = {};

///////////////////URL BUILDERS///////////////////
function getLoginUrl() {
    return baseUrl + "/accounts/login/";
}

function getLogoutUrl() {
    return baseUrl + "/accounts/logout/";
}

function getUserUrl(username) {
    return baseUrl + "/users/" + username;
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
      r: Math.min(parseInt(result[1], 16) + 35, 255),
      g: Math.min(parseInt(result[2], 16) + 35, 255),
      b: Math.min(parseInt(result[3], 16) + 35, 255)
  } : null;
}

function muteColor(colorString) {
  var rgb = hexToRgb(colorString);
  var rgbString = "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
  return rgbString;
}
