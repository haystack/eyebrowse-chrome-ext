"use strict";

var HTTP_UNAUTHORIZED = 401;
var HTTP_OK = 200;
var CSRF_REGEX = /name\='csrfmiddlewaretoken' value\='.*'/; //regex to find the csrf token
var LOGGED_IN_REGEX = /var username \= ".*"/;

///////////////////URL BUILDERS///////////////////
function url_login() {
    return baseUrl + "/accounts/login/";
}

function url_logout() {
    return baseUrl + "/accounts/logout/";
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
