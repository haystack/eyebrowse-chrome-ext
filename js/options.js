//$(document).ready(function() {
//    $("#main").html("Hello World Options Page 2345"+localStorage.getItem("serverURL"));
//});

$(document).ready(function() {

    var myDiv = $(document.createElement("div"));
    $('#options').append(myDiv);
    
    // SERVER ADDRESS GET/SET
    //  next: save change to localStorage
    //   will it be a problem to get persistence across sessions? 

    var urlBox = $(document.createElement("input"));
    urlBox.val(localStorage.getItem("serverURL"));
    urlBox.width(500);
    var urlBoxLabel = $(document.createElement("span"));
    urlBoxLabel.text("Server URL ");
    myDiv.append(urlBoxLabel);
    myDiv.append(urlBox);

    myDiv.append($(document.createElement("p")));
    myDiv.append($(document.createElement("span")).text("To set, press enter to in the textbox."));
    myDiv.append($(document.createElement("br")));    
    myDiv.append($(document.createElement("span")).text("To disable, delete the url and preset enter."));
    myDiv.append($(document.createElement("br")));

    urlBox.bind("enterKey",function(e){
           console.log("enter key in urlbox");//do stuff here
           localStorage.setItem("serverURL",urlBox.val()); // is there something more like "self"?
    });
    urlBox.keyup(function(e){
        if(e.keyCode == 13)    {
          $(this).trigger("enterKey");
        }
    });

    // BLACKLIST LISTING
    var blacklistLabel = $(document.createElement("span"));
    blacklistLabel.append($(document.createElement("h2")).text("Blacklist"));
    myDiv.append(blacklistLabel);
    var blacklistUL = $(document.createElement("ul"));
    myDiv.append(blacklistUL);
    window.backpage = chrome.extension.getBackgroundPage();
    var blacklist = backpage.user.getBlackList().getSet();
    console.log(blacklist);
    $.each(blacklist, function(key, value) {
        blacklistUL.append($(document.createElement("li")).text(value));
        console.log($(document.createElement("li")).text(value));
        });
    var blacklistUL = $(document.createElement("ul"));
});
