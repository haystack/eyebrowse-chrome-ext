"use strict";

/*
 * Parse urls
 * https://gist.github.com/jlong/2428561
 */
function getUrlParser(url) {
    var parser = document.createElement('a');
    parser.href = url;
    return parser;
}

function URI(url) {
    var parser = document.createElement('a');
    parser.href = url;
    this.protocol = parser.protocol; // => "http:"
    this.hostname = parser.hostname; // => "example.com"
    this.port = parser.port; // => "3000"
    this.pathname = parser.pathname; // => "/pathname/"
    this.search = parser.search; // => "?search=test"
    this.hash = parser.hash; // => "#hash"
    this.host = parser.host; // => "example.com:3000"
    parser.remove();
}

