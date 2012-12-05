$(document).ready(function() {

    var myDiv = $('#myDiv');
    
    //
    // POPULATE "SET" SECTION
    //

    // Server address get/set
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
    console.log("Hello world yeah yeah 26 from options.js");

    //
    // POPULATE "GET" SECTION
    //

    // Read user info from localStorage and only do stuff if the value is defined
    var userVal = JSON.parse(localStorage.getItem("user"));

    if (userVal) {
        var userInfo = $('#userInfo');
        
        // auxiliary function for listing properties
        var populateDivWithList = function(someDiv, list, property) {
            $.each(list, function(key, value) {
                someDiv.append($('<div></div>').text(value[property]));
            });
        };

        //
        // Populate whitelist 
        //

        console.log("Hello world yeah yeah 43 from options.js");

        if (userVal.whitelist) {
            var wlDiv = $('#whitelist');
            populateDivWithList(wlDiv,userVal.whitelist,'url');
        }

        console.log("Hello world yeah yeah 48 from options.js");

        //
        // Populate blacklist
        //

        console.log("Hello world yeah yeah 54 from options.js");

        if (userVal.blacklist) {
            var blDiv = $('#blacklist');
            populateDivWithList(blDiv,userVal.blacklist, 'url');
        }

        console.log("Hello world yeah yeah 63 from options.js");


        //
        // Populate username and logged-in status
        //

        var liDiv = $('#loggedIn');
        if (userVal.loggedIn != undefined) {
            liDiv.append($('<div></div>').text(userVal.loggedIn));
        } else {
            liDiv.append($('<div></div>').text("FFalse")); 
        }

        if (userVal.username) {
            var unDiv = $('#username');
            unDiv.append($('<div></div>').text(userVal.username));
        }

        // 
        // Display raw json of user item
        //
        var rjDiv = $('#rawJson');
        rjDiv.append($('<div></div>').text(JSON.stringify(userVal)));
    }

    //
    // button to clear localStorage and reload page
    //

    var console = chrome.extension.getBackgroundPage().console;
    console.log("reaching this point in options.js");

    var clearLocalStorage = function() {
        localStorage.removeItem('user');
        localStorage.removeItem('local_history');
        //localStorage.removeItem('baseUrl');
    };

    var myButton = $('<button/>',
    {
        text: 'Clear localStorage',
        click: function () { clearLocalStorage();window.location.reload();}
    });

    $('#options').append(myButton);

    console.log("Hello world yeah yeah theEnd from options.js");

});
