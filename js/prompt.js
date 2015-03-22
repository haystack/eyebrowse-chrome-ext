"use strict";

var FRAME_ID = "#eyebrowse-frame";
var TEMPLATE_HTML = {};

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

function initTemplates() {
    var url = chrome.extension.getURL("../html/prompt.html");
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
            TEMPLATE_HTML["#" + id] = el;
        }
    }
}

function getTemplate(templateId, templateArgs) {
    if (!Object.size(TEMPLATE_HTML)) {
        initTemplates();
    }
    var template = _unescape(TEMPLATE_HTML[templateId].html());
    return $(_.template(template, templateArgs));
}

function truncate(str, length) {
    if (str.length > length) {
        return str.substring(0, length);
    } else {
        return str;
    }
}

function createTrackPrompt(url) {
    return getTemplate("#track-prompt", {
        "url": new URL(url).hostname,
    });
}

function createLoginPrompt() {
    return getTemplate("#login-prompt");
}

// TODO(xxx): clean up
function createPopupPrompt(data, baseUrl) {

    if (data.active_users.length === 0 && data.message === "") {
        return "";
    }

    var div_html = "";
    div_html += "<style> #eyebrowse-frame:after {content: '';position: absolute !important;border-style: solid !important;border-width: 0 10px 10px !important;border-color: #FFFFFF transparent !important;display: block !important;width: 0 !important;z-index: 1 !important;top: -7px !important;right: 7px !important;}";
    div_html += "#eyebrowse-frame:before {content: ''; position: absolute !important; border-style: solid !important; border-width: 0 11px 11px !important; border-color: #333333 transparent !important;display: block !important;width: 0 !important;z-index: 0 !important;top: -12px !important;right: 6px !important;}</style>";

    var num = (data.active_users.length * 24) + 10;
    if (data.message === "") {
        if (num === 34) {
            num = 45;
        }
    } else {
        num += 195;
    }

    div_html += "<div id='eyebrowse-frame' style='";
    div_html += "z-index: 999999999 !important; ";
    div_html += "position: fixed !important; ";
    div_html += "right: 26px !important; ";
    div_html += "top: 12px !important; ";
    div_html += "padding: 3px 2px 4px 4px !important; ";
    div_html += "max-width: 390px !important; ";
    div_html += "min-width: 40px !important; ";
    div_html += "width: " + num.toString() + "px !important; ";
    div_html += "height: 32px !important; ";
    div_html += "text-align: center !important; ";
    div_html += "background: #FFFFFF !important; ";
    div_html += "-webkit-border-radius: 13px !important; ";
    div_html += "-moz-border-radius: 13px !important; ";
    div_html += "border-radius: 13px !important; ";
    div_html += "border: #333333 solid 3px !important; ";

    div_html += "webkit-box-sizing: border-box !important; ";
    div_html += "-moz-box-sizing: border-box !important; ";
    div_html += "box-sizing: border-box !important; ";

    div_html += "'>";

    if (data.message !== "") {
        div_html += "<div style='font-size: 9px !important; font-family: \"Helvetica Neue\",Helvetica,Arial,sans-serif !important; line-height: 11px !important; display: inline-block !important; max-width: 160px !important; height: 22px !important; position: relative !important; top: -10px !important;'>";

        if (data.user_url === "") {
            div_html += truncate(data.message, 78);
        } else {
            div_html += truncate(data.message, 51);
            div_html += " - <a href='" + data.user_url + "' title='" + data.username + "' target='_blank'>" + data.username + "</a> ";
        }
        div_html += data.about_message;
        div_html += "</div>";
    }


    if (data.message !== "" && data.active_users.length > 0) {
        div_html += "<div style='position: relative !important; top: -5px !important; height: 30px !important; display: inline-block !important; width: 2px !important; background-color: #000000 !important; margin: 0px 5px 0px 5px !important;'></div>";
    }

    if (data.active_users.length > 0) {
        div_html += "<div style='display: inline-block !important; position: relative !important;";

        if (data.message !== "") {
            div_html += "top: -15px !important; ";
        } else {
            div_html += "top: 0px !important; ";
        }

        div_html += "height: 22px !important;'>";
        for (var i = 0; i < data.active_users.length; i++) {
            var user = data.active_users[i];
            div_html += "<a href='" + user.url + "' target='_blank' title='" + user.username + " - " + user.time_ago + " ago'>";
            div_html += "<img style='";
            div_html += "margin: 1px !important; ";
            div_html += "border: 0px !important; ";
            div_html += "padding: 0px !important; ";
            if (user.old_level === 0) {
                div_html += "width: 18px !important; ";
                div_html += "height: 18px !important; ";
                div_html += "border: #ffff00 solid 2px !important; margin: 0px !important;'";
                div_html += "src='" + user.pic_url + "'></a>";
            } else if (user.old_level === 1) {
                div_html += "width: 20px !important; ";
                div_html += "height: 20px !important; ";
                div_html += "opacity: .9 !important;'src = '" + user.pic_url + "' > < /a>";
            } else if (user.old_level === 2) {
                div_html += "width: 20px !important; ";
                div_html += "height: 20px !important; ";
                div_html += "opacity: .75 !important;'src='" + user.pic_url + "'></a > ";
            } else if (user.old_level === 3) {
                div_html += "width: 20px!important;";
                div_html += "height: 20px!important;";
                div_html += "opacity: .6!important;'src='" + user.pic_url + "'></a>";
            }
        }
    }
    div_html += "</div>";

    div_html += "</div>";


    return div_html;
}


/*
    Call the eyebrowse server to get an iframe with a prompt
    Can either be a login or track type prompt.
*/
function setup(baseUrl, promptType, user, host, url) {
    if ($(FRAME_ID).length) {
        $(FRAME_ID).css("z-index", 999999999);
        return;
    }

    var frameHtml;

    if (promptType === "trackPrompt") {
        frameHtml = createTrackPrompt(url);
        addFrame(frameHtml);

        chrome.extension.sendMessage(JSON.stringify({
            "action": "nag",
            "url": window.document.URL
        }));

        $("#eyebrowse-allow-btn").click(function() {
            $(FRAME_ID).remove();
            var msg = {
                "action": "filterlist",
                "type": "whitelist",
                "url": url
            };
            chrome.extension.sendMessage(JSON.stringify(msg));
        });

        $("#eyebrowse-deny-btn").click(function() {
            $(FRAME_ID).remove();
            var msg = {
                "action": "filterlist",
                "type": "blacklist",
                "url": url
            };
            chrome.extension.sendMessage(JSON.stringify(msg));
        });

        $("#eyebrowse-close-btn").click(function() {
            $(FRAME_ID).remove();
        });

    } else if (promptType === "loginPrompt") {
        frameHtml = createLoginPrompt();
        addFrame(frameHtml);

        $("#eyebrowse-ignore-btn").click(function() {
            $(FRAME_ID).remove();
            msg = {
                "action": "ignore"
            };
            chrome.extension.sendMessage(JSON.stringify(msg));
        });

    } else {
        $.ajax({
            url: baseUrl + "/ext/popupInfo/",
            type: "POST",
            data: {
                "url": url,
                "csrfmiddlewaretoken": user.csrf,
            },
            success: function(data) {
                frameHtml = createPopupPrompt(data, baseUrl);
                addFrame(frameHtml);
            }
        });
    }
}

function setFade() {

    var fadeTime = 3000; //8 seconds
    var $popup = $(FRAME_ID);

    var fadePopup = setTimeout(function() {
        fade($popup);
    }, fadeTime);

    $popup.hover(function() {
        clearInterval(fadePopup);
        $popup.stop();
        $popup.css("opacity", 1.0);
    });

    $popup.mouseleave(function() {
        fadePopup = setTimeout(function() {
            fade($popup);
        }, fadeTime);
    });
}

function fade(el) {
    var $popup = $(FRAME_ID);
    el.fadeOut(1000, function() {
        $popup.animate({
            "top": $(FRAME_ID).css("top") - 120
        }, 500);
        $(FRAME_ID).remove();
    });
}

/*
 * Add the prompt css to the main page
 */
function addStyle() {
    if (!$("#eyebrowse-frame-css").length) {
        var url = chrome.extension.getURL("../css/prompt.css");
        $("head").append("<link id='eyebrowse-frame-css' href='" + url + "' type='text/css' rel='stylesheet' />");
    }
}


/*
 * Helper function which adds a popup frame to the page
 */
function addFrame(frameHtml) {
    $("body").append(frameHtml);
    addStyle();
    $(FRAME_ID).css("visibility", "visible");
    setFade();
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    var host = window.location.host;
    var protocol = window.location.protocol;
    var action = request.action;
    var url = document.URL;

    if (action === "prompt" && protocol === "http:") {
        setup(request.baseUrl, request.type, request.user, host, url);
    }
});
