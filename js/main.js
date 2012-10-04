// dictionary mapping all open items. Keyed on tabIds and containing all information to be written to the log. 
open_items = [];
var active_item;
open_items_dict = {};

/*
    inputs:
    tabId - indentifer of tab (unique to session only)
    url - url of the tab making the request
    title - title of the webpage the tab is displaying
    event_type - whether a tab is opening or closing/navigating to a new page etc
*/
function open_item(tabId, url, title, event_type) {

    //if event type is focus we need to close out the current tab
    if (event_type === "focus" && active_item != undefined) {
        close_item(active_item.tabId, 'blur');
    }
    
    //reassign the active item to be the current tab
    active_item = {
        'tabId' : tabId,
        'url' : url,
        'title' : title,
        'start_event' : event_type,
        'start_time' : new Date().getTime(), // milliseconds
    }

    open_items.push(active_item); // tmp for dev/testing
    update_badge();
}


local_storage = [] //tmp tmp tmp
function close_item(tabId, event_type) {
    /* 
        There is only ever one active_item at a time so only close out the active one. 
        This event will be fired when a tab is closed or unfocused but we would have already 'closed' the item so we don't want to do it again.
    */

    if (active_item.tabId === tabId) {
        //write to local storage
        var item = $.extend({}, active_item); //copy active_item
        item.end_event = event_type
        item.end_time = new Date().getTime()
        item.tot_time = item.start_time - item.end_time
        local_storage.push(item)
    }
}


//tmp for dev
function update_badge() {

    chrome.browserAction.setBadgeText(
        {
            text: String(open_items.length + 1)
        });
}