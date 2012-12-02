$(document).ready(function() {

    var myDiv = $('#myDiv');
    
    // SERVER ADDRESS GET/SET

    var urlBox = $(document.createElement("input"));
    urlBox.val(localStorage.getItem("baseUrl"));
    urlBox.width(500);
    var urlBoxLabel = $(document.createElement("span"));
    urlBoxLabel.text("Server URL ");
    myDiv.append(urlBoxLabel);
    myDiv.append(urlBox);

    urlBox.bind("enterKey",function(e){
           console.log("enter key in urlbox");//do stuff here
           localStorage.setItem("baseUrl",urlBox.val()); // is there something more like "self"?
    });
    urlBox.keyup(function(e){
        if(e.keyCode == 13)    {
          $(this).trigger("enterKey");
        }
    });

    var console = chrome.extension.getBackgroundPage().console;
    console.log("Hello world from options.js");

    // Read user info from localStorage
    var userInfo = $('#userInfo');
    var userVal = JSON.parse(localStorage.getItem("user"));

    // auxiliary function for listing properties
    var populateDivWithList = function(someDiv, list, property) {
        $.each(list, function(key, value) {
            someDiv.append($('<div></div>').text(value[property]));
        });
    };

    //
    // Populate whitelist 
    //

    var wlDiv = $('#whitelist');
    populateDivWithList(wlDiv,userVal.whitelist,'url');

    //
    // Populate blacklist
    //

    var blDiv = $('#blacklist');
    populateDivWithList(blDiv,userVal.blacklist, 'url');

    var liDiv = $('#loggedIn');
    liDiv.append($('<div></div>').text(userVal.username+", "+userVal.loggedIn));

    var rjDiv = $('#rawJson');
    rjDiv.append($('<div></div>').text(JSON.stringify(userVal)));

});
