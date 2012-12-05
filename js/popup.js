LoginView = Backbone.View.extend({
    'el' : $('.content-container'),

    initialize : function() {
        chrome.extension.getBackgroundPage().console.log("LoginView initialization1.");
        _.bindAll(this);
        this.render();
    },

    render : function() {
        if (!user.isLoggedIn()) {
            $('.content-container').empty();
            $('body').css('width', '300px');
            var template = _.template($("#login_template").html(), {
                    'baseUrl' : baseUrl,
                });

            $(this.el).html(template); //[swgree] what is this? el=element?
            $('#errors').fadeOut();
            $('#id_username').focus();
        }
    },

    events : {
        "click #login" : "getLogin",
        "keypress input" : "filterKey"
    },

    filterKey : function(e) {
        if (e.which == 13) { // listen for enter event
            e.preventDefault();
            this.getLogin()
        }
    },

    getLogin : function() {
        $('#errors').fadeOut();
        var self = this;
        var username = $('#id_username').val();
        var password = $('#id_password').val();
        if (username === '' || password === '') {
            self.displayErrors("Enter a username and a password")
        } else {
            $.get(url_login(), function(data) {
                self.postLogin(data, username, password);
            });
        }
    },

    postLogin : function(data, username, password) {
        chrome.extension.getBackgroundPage().console.log("LoginView.postLogin: evaluating.");
        var REGEX = /name\='csrfmiddlewaretoken' value\='.*'/; //regex to find the csrf token
        var match = data.match(REGEX);
        var self = this;
        if (match) {
            match = match[0]
            var csrfmiddlewaretoken = match.slice(match.indexOf("value=") + 7, match.length-1); // grab the csrf token
            //now call the server and login
            $.ajax({
                url: url_login(),
                type: "POST",
                data: {
                        "username": username,
                        "password": password,
                        "csrfmiddlewaretoken" : csrfmiddlewaretoken,
                        "remember_me": 'on', // for convenience
                },
                dataType: "html",
                success: function(data) {
                    chrome.extension.getBackgroundPage().console.log("LoginView.postLogin:ajax.success evaluating.");
                    var match = data.match(REGEX)
                    if(match) { // we didn't log in successfully
                        chrome.extension.getBackgroundPage().console.log("LoginView.postLogin:ajax.success login.fail evaluating.");
                        self.displayErrors("Invalid username or password");
                    } else {
                        chrome.extension.getBackgroundPage().console.log("LoginView.postLogin:ajax.success login.success evaluating.");
                        self.completeLogin(username)
                    }
                },
                error : function(data) {
                    self.displayErrors("Unable to connect, try again later.")
                }
            });
        }
        else {
            self.completeLogin(username);
        }
    },

    completeLogin : function(username) {
        var console = chrome.extension.getBackgroundPage().console;
        console.log("LoginView.completeLogin: evaluating1.");
        //chrome.extension.getBackgroundPage().console.log("LoginView.completeLogin: evaluating.");
        $('#login_container').remove();
        $('body').css('width', '600px');
        console.log(JSON.stringify(user));
        console.log("LoginView.completeLogin: Initial log of JSON.stringify(user).");
        user.setLogin(true);
        homeView = new HomeView();
        user.setUsername(username);
        navView.render('home_tab');
        //
        // Update user attributes in localStorage
        //
        user.getBlacklist().fetch({
            success: function (data) {
                chrome.extension.getBackgroundPage().console.log("Fetching blacklist succeeded.");
                localStorage['user'] = JSON.stringify(user);
            }
        });
        user.getWhitelist().fetch({
            success: function (data) {
                chrome.extension.getBackgroundPage().console.log("Fetching whitelist succeeded.");
                localStorage['user'] = JSON.stringify(user);
            }
        });
    },

    // this isn't getting called -- after logging out, "user" still exists and isLoggedIn
    logout : function() {
        $.get(url_logout());
        user.setLogin(false);
        this.render();
    },

    displayErrors : function(errorMsg) {
        $errorDiv = $('#errors');
        $errorDiv.html(errorMsg);
        $errorDiv.fadeIn();
    },

});

NavView = Backbone.View.extend({
    'el' : $('.nav-container'),

    initialize : function(){
        this.render('home_tab');
        $('.brand').blur()
    },

    render : function(tab) {
        $('.nav-container').empty();
        var loggedIn = user.isLoggedIn();
        var template = _.template($("#nav_template").html(), {
                baseUrl : baseUrl,
                loggedIn : loggedIn,
            });

        $(this.el).html(template);
        if (!loggedIn) {
            tab = "login_tab"
        }
        $('nav-tab').removeClass('active');
        $('#' + tab).addClass('active').click();
    },
});

HomeView = Backbone.View.extend({
    'el' : $('.content-container'),

    initialize : function(){
        this.render()
    },

    render : function() {
        if (!user.isLoggedIn()) {
            return
        }
        var template = _.template($("#splash_template").html());
        $(this.el).html(template);
        $('a').click(clickHandle)
    },
});

function clickHandle(e) {
    var url = $(e.target).context.href;
    if (url.toLowerCase().indexOf(baseUrl) >= 0) {
        backpage.openLink(url);
    }

}

///////////////////URL BUILDERS///////////////////
function url_login() {
    return baseUrl + '/accounts/login/'
}

function url_logout() {
    return baseUrl + '/accounts/logout/'
}

$(document).ready(function() {
    window.backpage = chrome.extension.getBackgroundPage();
    window.backpage.console.log("This is the popup.js ready function.");
    user = backpage.user;
    baseUrl = backpage.baseUrl;
    navView =  new NavView();
    loginView = new LoginView(); // (presumably) calls initialization
    var homeView;
    if (user.isLoggedIn()){
        homeView = new HomeView();
    }
    $(document).click('#home_tab', function(){
        if (homeView != undefined) {
            homeView.render();
        }
    });
    $('a').click(clickHandle)
});