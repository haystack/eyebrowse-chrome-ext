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

//tmp for dev
function update_badge() {

    chrome.browserAction.setBadgeText(
        {
            text: String(visited.length + 1)
        });
}