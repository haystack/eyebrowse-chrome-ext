$(document).ready(function() {
    window.backpage = chrome.extension.getBackgroundPage();
    var v = backpage.visited;
    for (var i =0; i < v.length; i++) {
        $('#main').append('<div>' + (i+1) + ". " + v[i] + '</div>');
    }
    $('#reset').click(function (e) {
        $('#main').html("Pages Visited:");
        backpage.visited = [];
    });
});