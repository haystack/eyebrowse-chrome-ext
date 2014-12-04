/*
    Call the eyebrowse server to get an iframe with a prompt
    Can either be a login or track type prompt.
*/
function setup(baseUrl, promptType, host, url) {
    if ($("#eyebrowse-frame").length) {
        $("#eyebrowse-frame").css("z-index", 999999999);
        return;
    }
    if (promptType === "getTickerInfo") {
        var size = 400;
        var height = 40;
        var settings = {
            "z-index": 999999999,
            "border-style": "none",
            "width": size,
            "height": height,
            "position": "fixed",
            "padding": "0px",
            "margin": "0px",
            "right": "0px",
            "bottom": "0px",
        };

        var eyebrowseFrame = $("<iframe>").css(settings).attr("id", "eyebrowse-frame").attr("src", baseUrl + "/ext/" + promptType + "?url=" + url);
    } else if (promptType === "trackPrompt" || promptType === "loginPrompt") {
        var size = 350;
        var height = 200;
        var settings = {
            "z-index": 999999999,
            "border-style": "none",
            "width": size,
            "height": height,
            "position": "fixed",
            "right": "0px",
            "top": "0px",
        };
        var eyebrowseFrame = $("<iframe>").css(settings).attr("id", "eyebrowse-frame").attr("src", baseUrl + "/ext/" + promptType + "?site=" + host);
    } else {
        var size = 400;
        var height = 70;
        var settings = {
            "z-index": 999999999,
            "border-style": "none",
            "width": size,
            "height": height,
            "position": "fixed",
            "padding": "0px",
            "margin": "0px",
            "right": "0px",
            "top": "0px",
        };

        var eyebrowseFrame = $("<iframe>").css(settings).attr("id", "eyebrowse-frame").attr("src", baseUrl + "/ext/" + promptType + "?url=" + url);
    }
    $("body").append(eyebrowseFrame);
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    var host = window.location.host;
    var protocol = window.location.protocol;
    var action = request.action;
    var url = document.URL;


    if (action === "prompt" && protocol === "http:") {
        setup(request.baseUrl, request.type, host, url);

        window.addEventListener("message", function(e) {
            if (e.origin === request.baseUrl) {
                var msg = JSON.parse(e.data);
                if (msg.action === "fade") {
                    $("#eyebrowse-frame").remove();
                    chrome.extension.sendMessage(JSON.stringify({
                        "action": "nag",
                        "url": window.document.URL
                    }));
                } else {
                    msg.url = host;
                    chrome.extension.sendMessage(JSON.stringify(msg));

                }
            }
        }, false);
    }
});
