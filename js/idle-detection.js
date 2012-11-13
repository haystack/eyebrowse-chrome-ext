/*
    https://github.com/jasonmcleod/jquery.idle
    Detect if the current tab is idle or not and close/open the active item respectively. 
*/

    alert('hi')
$(document).idle(
function() { //onidle
    chrome.extension.sendMessage('closeItem');
}, 
function(){ //onactive
    chrome.extension.sendMessage('openItem');
}, {
    'after': 50000, //5 min max idle
}]);

