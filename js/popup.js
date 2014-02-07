////// MODELS //////////

var ChatUser = Backbone.Model.extend({
    defaults: {
        username: null,
        pic_url: null,
    },
});

var ChatUserCollection = Backbone.Collection.extend({
	model: ChatUser
});

/////// VIEWS /////////////

var ChatUserView = Backbone.View.extend({
	tagName: 'div',
	render: function(){
		this.$el.html('<img src="' + baseUrl + this.model.get('pic_url') + '" alt="' + this.model.get('username') + '" class="nav-prof-img img-rounded">');
		return this
	}
});

var ChatCollectionView = Backbone.View.extend({
	tagName: 'div',
	
	initialize: function(){
		console.log(this.collection);
	},
	render: function(){
		this.collection.each(function(person) {
			var userView = new ChatUserView({model: person});
			this.$el.append(userView.render().el);
		}, this);
		return this;
	}
});

LoginView = Backbone.View.extend({
    "el" : $(".content-container"),

    initialize : function() {
        _.bindAll(this);
        this.render();
    },

    render : function() {
        if (!user.isLoggedIn()) {
            $(".content-container").empty();
            $("body").css("width", "300px");
            var template = _.template($("#login_template").html(), {
                    "baseUrl" : baseUrl,
                });

            $(this.el).html(template);
            $("#errors").fadeOut();
            $("#id_username").focus();
        }
    },

    events : {
        "click #login" : "getLogin",
        "keypress input" : "filterKey"
    },

    filterKey : function(e) {
        if (e.which === 13) { // listen for enter event
            e.preventDefault();
            this.getLogin()
        }
    },

    getLogin : function() {
        $("#errors").fadeOut();
        $("#login").button("loading");
        var self = this;
        var username = $("#id_username").val();
        var password = $("#id_password").val();
        if (username === " || password === ") {
            self.displayErrors("Enter a username and a password")
        } else {
            $.get(url_login(), function(data) {
                self.postLogin(data, username, password);
            });
        }
    },

    postLogin : function(data, username, password) {
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
                        "remember_me": "on", // for convenience
                },
                dataType: "html",
                success: function(data) {
                    var match = data.match(REGEX)
                    if(match) { // we didn"t log in successfully
                        
                        self.displayErrors("Invalid username or password");
                    } else {
                        self.completeLogin(username)
                    }
                },
                error : function(data) {
                    console.log(JSON.stringify(data))
                    self.displayErrors("Unable to connect, try again later.")
                }
            });
        } else if (match == null){
            self.displayErrors("Unable to connect, try again later.")
        }else {
            self.completeLogin(username);
        }
    },

    completeLogin : function(username) {
        $("#login_container").remove();
        $("body").css("width", "400px");

        user.login();
        user.setUsername(username);
        navView.render("home_tab");
        homeView = new HomeView();
        //
        // Update user attributes in localStorage
        //
        user.getBlacklist().fetch({
            success: function (data) {
                user.saveState();
            }
        });
        user.getWhitelist().fetch({
            success: function (data) {
                user.saveState();
            }
        });
    },

    logout : function() {
        $.get(url_logout());
        user.logout();
        backpage.clearLocalStorage("user")
        this.render();
    },

    displayErrors : function(errorMsg) {
        $("#login").button("reset");
        var $errorDiv = $("#errors");
        $errorDiv.html(errorMsg);
        $errorDiv.fadeIn();
    },

});

NavView = Backbone.View.extend({
    "el" : $(".nav-container"),

    initialize : function(){
        this.render("home_tab");
        $(".brand").blur()
    },

    render : function(tab) {
        $(".nav-container").empty();
        var loggedIn = user.isLoggedIn();
        var template = _.template($("#nav_template").html(), {
                baseUrl : baseUrl,
                loggedIn : loggedIn,
            });

        $(this.el).html(template);
        if (!loggedIn) {
            tab = "login_tab"
        }
        $("nav-tab").removeClass("active");
        $("#" + tab).addClass("active").click();
    },
});

HomeView = Backbone.View.extend({
    "el" : $(".content-container"),

    initialize : function(){
        this.render()
    },

    render : function() {
        if (!user.isLoggedIn()) {
            return
        }
        chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
    		populateActiveUsers(tabs[0]);
    	});	
    	
    	var template = _.template($("#splash_template").html());
	    $(this.el).html(template);

    },
});

//get all the active users on a page and populate the view
function populateActiveUsers(tab) {
	var text = getActiveUsers(tab.url);
	var parsed = JSON.parse(text);
	var users = parsed["result"];
	var active_users = [];
	$.each(users, function(index,value) {
		console.log(value["username"]);
		active_users.push({"username": value["username"], "pic_url": value["pic_url"]});
	});
	var user_coll = new ChatUserCollection(active_users);
	var user_view = new ChatCollectionView({ collection: user_coll });
    
    $("#chatuser").empty().append(user_view.render().el);

}

function clickHandle(e) {
    e.preventDefault();
    var url = $(e.target).context.href;
    if (url.indexOf("logout") !== -1) {
        loginView.logout();
    } else if (url.indexOf("http") !== -1){
        backpage.openLink(url);
    }else if (url.indexOf("login") !== -1){
        return
    } else {
        url = url.split("#")[1];
        user.setTab(url);
        subNavView.render();
    }
}


////////////// AJAX CSRF PROTECTION///////////

/*
Ajax CSRF protection
*/
function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

function sameOrigin(url) {
    // test that a given url is a same-origin URL
    // url could be relative or scheme relative or absolute
    var host = document.location.host; // host + port
    var protocol = document.location.protocol;
    var sr_origin = "//" + host;
    var origin = protocol + sr_origin;
    // Allow absolute or scheme relative URLs to same origin
    return (url == origin || url.slice(0, origin.length + 1) == origin + "/") ||
        (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + "/") ||
        // or any other URL that isn"t scheme relative or absolute i.e relative.
        !(/^(\/\/|http:|https:).*/.test(url));
}

function ajaxSetup(csrftoken){
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type)) {
                // Send the token to same-origin, relative URLs only.
                // Send the token only if the method warrants CSRF protection
                // Using the CSRFToken value acquired earlier
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });
}

///////////////////CHAT AND MESSAGE FUNCTIONALITY///////////////////
/*
	Get active users from server
*/
function getActiveUsers(url) {
	var encoded_url = encodeURIComponent(url);
	var req_url = sprintf("%s/ext/getActiveUsers?url=%s", baseUrl, encoded_url);
	return $.ajax({
		type: "GET",
		url: req_url,
		dataType: "json",
		async: false
    }).responseText;
}


///////////////////URL BUILDERS///////////////////
function url_login() {
    return baseUrl + "/accounts/login/"
}

function url_logout() {
    return baseUrl + "/accounts/logout/"
}

$(document).ready(function() {
    window.backpage = chrome.extension.getBackgroundPage();
    user = backpage.user;
    baseUrl = backpage.baseUrl;
    navView =  new NavView();
    loginView = new LoginView(); // (presumably) calls initialization
    var homeView;

    /////setup funcs///////
    chrome.cookies.get({
        "name" :"csrftoken", 
        "url" : baseUrl
        }, function(cookie){
            ajaxSetup(cookie.value);
    });
    
    if (user.isLoggedIn()){
        homeView = new HomeView();
    }
    $(document).click("#home_tab", function(){
        if (homeView !== undefined) {
            homeView.render();
        }
    });
    $("a").click(clickHandle)
});