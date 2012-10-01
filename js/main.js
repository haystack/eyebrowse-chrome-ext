function login() {
    //TODO -- implement after server code is in place
}

function logout() {
    //TODO -- implement after server code is in place
}

function focus() {
    //TODO
}

function create() {
    //TODO
}

function destroy() {
    //TODO
}

function getTime() {
    //TODO
}

function getSite() {
    //TODO
}

function inactive() {
    //TODO
}

function active() {
    //TODO
}

visited = [] // tmp until we figure out local storage

//inputs:
//tabId - indentifer of tab (unique to session only)
//url - url of the tab making the request
//title - title of the webpage the tab is displaying
//event_type - whether a tab is opening or closing/navigating to a new page etc
function record_history(tabId, url, title, event_type) {
    visited.push(url)
    update_badge();
}


//tmp for dev
function update_badge() {

    chrome.browserAction.setBadgeText(
        {
            text: String(visited.length + 1)
        });
}