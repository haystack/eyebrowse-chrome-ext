function sendMessage(action) {
    var message = {
        "action": "idle",
        "type": action,
    };
    chrome.extension.sendMessage(JSON.stringify(message));
}
/*
    https://github.com/jasonmcleod/jquery.idle
    Detect if the current tab is idle or not and close/open the active item respectively.
*/
$(window).idle(
    function() {
        sendMessage("closeItem"); //on idle 
    },
    function() {

        sendMessage("openItem"); //on active
    }, {
        "after": 50000, //5 min max idle
    });
