/*
    Call the eyebrowse server to get an iframe with a prompt
    Can either be a login or track type prompt. 
*/
function setup(baseUrl, promptType, host) {
    if ($("#eyebrowse-frame").length) {
        $("#eyebrowse-frame").css("z-index", 999999999);
        return;
    }
    var size = 350;
    var height = 200;
    var settings =  {
        "z-index": 999999999,
        "border-style": "none",
        "width": size,
        "height": height,
        "position": "fixed",
        "right": "0px",
        "top": "0px",
    };
    var eyebrowseFrame = $("<iframe>").css(settings).attr("id", "eyebrowse-frame").attr("src", baseUrl + "/ext/" +  promptType +"?site=" + host);

    $("body").append(eyebrowseFrame);
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    host = window.location.host;
    var action = request.action;
    if (action === "prompt") {
        setup(request.baseUrl, request.type, host);
        
        window.addEventListener("message", function(e){
                if (e.origin === request.baseUrl){
                    var msg = JSON.parse(e.data);
                    if (msg.action === "fade"){
                         $("#eyebrowse-frame").remove()
                         chrome.extension.sendMessage(JSON.stringify({"action":"nag","url":window.document.URL}));
                    } else {
                        msg.url = host;
                        chrome.extension.sendMessage(JSON.stringify(msg));
                       
                    }
                }
        }, false);
    }
});