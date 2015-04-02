"use strict";

var FRAME_ID = "#eyebrowse-frame";
var TEMPLATE_HTML = {};

function truncate(str, length) {
    if (str.length > length) {
        return str.substring(0, length);
    } else {
        return str;
    }
}

function createTrackPrompt(url) {
    return getPromptTemplate("#track-prompt", {
        "url": new URL(url).hostname,
    });
}

function createLoginPrompt() {
    return getPromptTemplate("#login-prompt");
}

function createBubblePrompt(data, baseUrl) {

    if (data.active_users.length === 0 && data.message === "") {
        return null;
    }

    var msg = truncate(data.message, 51);
    
    if (data.user_url === "") {
        msg = truncate(data.message, 78);
    }
    
    msg = createMentionTag(msg);

    var template = getPromptTemplate("#bubble-prompt", {
        "msg": msg,
        "user_url": data.user_url,
        "username": data.username,
        "about_message": data.about_message,
        "users": data.active_users
    });

    var images = template.find(".eyebrowse-bubble-user-icon");
    for (var i = 0; i < images.length; i++) {
        $(images[i]).attr("src", data.active_users[i].pic_url);
    }
    return template;
}
/*
    Call the eyebrowse server to get an iframe with a prompt
    Can either be a login or track type prompt.
*/
function setup(baseUrl, promptType, user, url, protocol) {
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

    } else if (promptType === "loginPrompt") {
        frameHtml = createLoginPrompt();
        addFrame(frameHtml);

        $("#eyebrowse-ignore-btn").click(function() {
            $(FRAME_ID).remove();
            var msg = {
                "action": "ignore"
            };
            chrome.extension.sendMessage(JSON.stringify(msg));
        });

    } else if (promptType === "getInfo" && protocol === "http:") { // TODO fix with ssl certs for eyebrowse
        $.ajax({
            url: baseUrl + "/ext/bubbleInfo/",
            type: "POST",
            data: {
                "url": url,
                "csrfmiddlewaretoken": user.csrf,
            },
            success: function(data) {
                frameHtml = createBubblePrompt(data, baseUrl);
                addFrame(frameHtml);
            }
        });
    }
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
    if (frameHtml === null) {
        return;
    }
    
    addStyle();
    $("body").append(frameHtml);
    
    // Remove the element after it fades out. The fading & delay is taken care by CSS
    $(FRAME_ID).bind("animationend webkitAnimationEnd", function (evt) {
    	if (evt.animationName == "fade") {
    		this.parentNode.removeChild(this);
    	}
    });
    
    $("#eyebrowse-close-btn").click(function() {
        $(FRAME_ID).remove();
    });
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    var protocol = window.location.protocol;
    var url = document.URL;
    var action = request.action;

    if (action === "prompt") {
        setup(request.baseUrl, request.type, request.user, url, protocol);
    }
});
