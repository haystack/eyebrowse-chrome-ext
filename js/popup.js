////// MODELS //////////

var ChatUser = Backbone.Model.extend({
    defaults: {
        username: null,
        pic_url: null,
        resourceURI: null,
        unread_messages: 0,
    },
});

var ChatUserCollection = Backbone.Collection.extend({
	model: ChatUser
});

var ChatMessage = Backbone.Model.extend({
    defaults: {
        from_user: null,
        to_user: null,
        message: '',
        url: null,
        date: null,
    },
});

var ChatMessageCollection = Backbone.Collection.extend({
	model: ChatMessage
});

var PageFeedItem = Backbone.Model.extend({
    defaults: {
        username: null,
        pic_url: null,
        message: null,
        date: null,
        url: null,
    },
});

var PageFeedCollection = Backbone.Collection.extend({
	model: PageFeedItem
});

var Stats = Backbone.Model.extend({
	defaults: {
		my_time: 0,
		my_count: 0,
		total_time: 0,
		total_count: 0,
		my_dtime: 0,
		my_dcount: 0,
		total_dtime: 0,
		total_dcount: 0,
	}
});


/////// VIEWS /////////////

var PageFeedItemView = Backbone.View.extend({
	tagName: 'div',
	className: 'pagefeedline',
	render: function(){
		var messages = this.model.get('message');
		var username = this.model.get('username');
		
		if (messages.length > 0) {
			var code_str = "";
			$.each(messages, function(index, message) {
				var time_str = message.post_time.substring(0,10) + ' ' + message.post_time.substring(11,19) + ' UTC';
				var time = new Date(time_str);
				var hum_time = moment(time).fromNow();
				code_str += '<div class="pagefeed_item"><span class="pagefeed_text">' + message.message + '</span><div class="right"><span class="message-name">' + 
				username + '</span> <span class="date">' + hum_time + '</span></div></div>';
			});
			this.$el.html(code_str);
		} else {
			var time_str = this.model.get('start_time').substring(0,10) + ' ' + this.model.get('start_time').substring(11,19) + ' UTC';
			var time = new Date(time_str);
			var hum_time = moment(time).fromNow();
			this.$el.html('<div class="pagefeed_item"><div class="right"><span class="message-name">' + 
			 username + '</span> <span class="date">was here ' + hum_time + '</span></div></div>');
		
		}
		return this;
	},
});

var PageFeedCollectionView = Backbone.View.extend({
	tagName: "div",
	className: "pagefeedbox",
	render: function(){
		this.collection.each(function(message) {
			var messageView = new PageFeedItemView({model: message});
			this.$el.append(messageView.render().el);
		}, this);
		return this;
	}
});

var ChatUserView = Backbone.View.extend({
	tagName: 'div',
	className: 'chatuser_pic',
	render: function(){
		var code = '<div id="' + this.model.get('username') +'">';
		if (this.model.get('unread_messages') == '0') {
			code = code + '<span class="unread"> </span>';
		} else {
			code = code + '<span class="unread">' + this.model.get('unread_messages') + '</span>';
		}
		code = code + '<img src="' + this.model.get('pic_url') + 
			 '" title="' + this.model.get('username') + 
			 '" class="nav-prof-img img-rounded"> <span class="name">' + 
			 this.model.get('username') + '</span></div>';
		
		this.$el.html(code);
		
		if ((window.selected_user != null && window.selected_user != undefined) &&
			(this.model.get('username') == window.selected_user.get('username'))) {
			$(this.el).css('padding', '0px');
			$(this.el).css('border', 'solid 2px');
		}
		return this;
	},
	events: {
		'click': "getChatMessages",
		'hover': "hoverUser"
	},
	hoverUser: function(event) {
		$(".chatuser_pic").css('cursor', 'pointer');
	},
	getChatMessages: function(event) {
		window.selected_user = this.model;
		
		clearInterval(window.message_interval);
		
		$(".chatuser_pic").css('border', '0px');
		$(".chatuser_pic").css('padding', '2px');
		
		
		$(event.currentTarget).css('padding', '0px');
		$(event.currentTarget).css('border', 'solid 2px');
		
		$("#textbox").attr('readonly', false);
		$("#textbox").focus();
		
		$('#textbox').unbind();
				    
	    $('#textbox').bind("enterKey",function(e){
	    	var text = $("#textbox").val();
			postChatMessage(window.selected_user.get('resourceURI'), text, window.g_url);
		});
		$('#textbox').keyup(function(e){
			if(e.keyCode == 13){
		  		$(this).trigger("enterKey");
			}
		});
		populateChatMessageBox();
		
		$('#chatmessage').scrollTop($('#chatmessage')[0].scrollHeight);
		
	}
});

var ChatCollectionView = Backbone.View.extend({
	tagName: "div",
	className: "chatuser_row",

	render: function(){
		this.collection.each(function(person) {
			var userView = new ChatUserView({model: person});
			this.$el.append(userView.render().el);
		}, this);
		return this;
	}
});

var ChatMessageView = Backbone.View.extend({
	tagName: 'div',
	className: 'chatmessageline',
	render: function(){
		if (this.model.get('from_user') == user.get('username')) {
			this.$el.html('<div class="my_message"><div class="message-text">' + this.model.get('message') + '</div><div class="date">' + this.model.get('date') + '</div></div>');
		} else {
			this.$el.html('<div class="their_message"><div class="message-text">' + this.model.get('message') + '</div><div class="date">' + this.model.get('date') + '</div></div>');
		}
		
		return this;
	},
});

var ChatMessageCollectionView = Backbone.View.extend({
	tagName: "div",
	className: "chatmessages",

	render: function(){
		this.collection.each(function(message) {
			var messageView = new ChatMessageView({model: message});
			this.$el.append(messageView.render().el);
		}, this);
		return this;
	}
});

var StatsView = Backbone.View.extend({
	tagName: 'div',
	className: 'stat_info',
	render: function(){
		var title = window.g_title;
		if (title.length > 50) {
			title = window.g_title.substring(0,50) + '...';
		}
			
		this.$el.html('<div class="stat_title">This Page</div>' +
					  '<div class="my_stats">I logged ' + this.model.get('my_count') + ' in ' + this.model.get('my_time') +
					  ' | Everyone logged ' + this.model.get('total_count') + ' in ' + this.model.get('total_time') + '</div>' +
					  '<div class="stat_title">' + window.g_url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/)[1] + '</div>' +
					  '<div class="my_stats">I logged ' + this.model.get('my_dcount') + ' in ' + this.model.get('my_dtime') +
					  ' | Everyone logged ' + this.model.get('total_dcount') + ' in ' + this.model.get('total_dtime') + '</div>');
		return this;
	},
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
            $("body").css("height", "190px");
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
        "keypress #id_username" : "filterKey",
        "keypress #id_password" : "filterKey"
    },

    filterKey : function(e) {
        if (e.which === 13) { // listen for enter event
            e.preventDefault();
            this.getLogin();
        }
    },

    getLogin : function() {
        $("#errors").fadeOut();
        $("#login").button("loading");
        var self = this;
        var username = $("#id_username").val();
        g_username = username;
        var password = $("#id_password").val();
        if (username === " || password === ") {
            self.displayErrors("Enter a username and a password");
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
            match = match[0];
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
                    var match = data.match(REGEX);
                    if(match) { // we didn"t log in successfully
                        
                        self.displayErrors("Invalid username or password");
                    } else {
                        self.completeLogin(username);
                    }
                },
                error : function(data) {
                    console.log(JSON.stringify(data));
                    self.displayErrors("Unable to connect, try again later.");
                }
            });
        } else if (match == null){
            self.displayErrors("Unable to connect, try again later.");
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
        backpage.clearLocalStorage("user");
        this.render();
        navView.render("home_tab");
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
        $(".brand").blur();
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
            tab = "login_tab";
            $("#" + tab).addClass("active").click();
        }
        $("nav-tab").removeClass("active");
    },
});

HomeView = Backbone.View.extend({
    "el" : $(".content-container"),

    initialize : function(){
        this.render();
    },

    render : function() {
        if (!user.isLoggedIn()) {
            return;
        }
        chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
        	window.g_url = tabs[0].url;
        	window.g_title = tabs[0].title;
        	populateStats();
        	window.g_favIcon = tabs[0].favIconUrl;
        	populateActiveUsers();
        	window.setInterval(function() {populateActiveUsers();}, 6000);
        	populateFeed();
        	setupMessageBox();
	        	
    	});	
    	
    	var template = _.template($("#splash_template").html());
	    $(this.el).html(template);
    },
});

function setupMessageBox() {
	$("#messagebox")
		.focus(function() {
	        if (this.value === this.defaultValue) {
	            this.value = '';
	        }
	  	})
	  	.blur(function() {
	        if (this.value === '') {
	            this.value = this.defaultValue;
	        }
		});
	
	$('#messagebox').keypress(function(e){
		if (e.which == 13) {
			var text = $("#messagebox").val();
				postMessage(text, window.g_url);
			}
		});
	
	$('#submitmessage').click( function(e){
		var text = $("#messagebox").val();
			postMessage(text, window.g_url);
		});

}


//populate chat message box once you've clicked on a chatuser
function populateChatMessageBox() {
	var message_text = getMessages(window.g_url, window.selected_user.get('username'));
	var parsed = JSON.parse(message_text)["objects"];
	var messages = [];
	$.each(parsed, function(index,value) {
		messages.push(value);
	});
	if (messages.length != 0) {
		var messages_coll = new ChatMessageCollection(messages);
		var messages_view = new ChatMessageCollectionView({ collection: messages_coll });
	    
	    var c = messages_view.render().el;
	    $("#chatmessage").empty().append(c);
	}
	else {
		$("#chatmessage").empty();
	}
}


//get all the stats for a page and domain and populate the view
function populateStats() {
	var tab_url = window.g_url;
	var title = window.g_title;
	var info = getStats(tab_url);
	var parsed = JSON.parse(info);
	var values = parsed["result"];
	var stats = new Stats(values);
	var statview = new StatsView({model: stats});
	var c = statview.render().el;
    $("#stats").empty().append(c);  
}


//get all the active users on a page and populate the view
function populateActiveUsers() {
	var tab_url = window.g_url;
	var text = getActiveUsers(tab_url);
	var parsed = JSON.parse(text);
	var users = parsed["result"];
	var active_users = [];
	$.each(users, function(index,value) {
		active_users.push(value);
	});
	if (active_users.length == 0) {
		$("#chatuserbox").empty().append("No one currently online");
		window.selected_user = null;
	}
	else {
		var user_coll = new ChatUserCollection(active_users);
		var user_view = new ChatCollectionView({ collection: user_coll });
	    var c = user_view.render().el;
	    $("#chatuserbox").empty().append(c);  
	    
	    if (window.selected_user != undefined && window.selected_user != null) {
	    	populateChatMessageBox();
	    }
	}
}

//populate feed for a page
function populateFeed() {
	var tab_url = window.g_url;
	var text = getFeed(tab_url);
	var parsed = JSON.parse(text);
	var histories = parsed["objects"];
	var feed_items = [];
	$.each(histories, function(index,value) {
		feed_items.push(value);
	});
	 if (feed_items.length == 0) {
		 $("#pagefeed").empty().append("No activity on this feed.");
	 }
	 else {
		 var feed_coll = new PageFeedCollection(feed_items);
		 var feed_view = new PageFeedCollectionView({ collection: feed_coll });	    
	     var c = feed_view.render().el;
	     $("#pagefeed").empty().append(c);
	 }
}

function clickHandle(e) {
    e.preventDefault();
    var url = $(e.target).context.href;
    if (url.indexOf("logout") !== -1) {
        loginView.logout();
    } else if (url.indexOf("http") !== -1){
        backpage.openLink(url);
    }else if (url.indexOf("login") !== -1){
        return;
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

///////////////////CHAT AND MESSAGE API CALLS///////////////////

/*
	Get Activity Feed from server
*/

function getFeed(url) {
	var encoded_url = encodeURIComponent(url);
	var req_url = sprintf("%s/api/v1/history-data?format=json&url=%s", baseUrl, encoded_url);
	return $.ajax({
		type: "GET",
		url: req_url,
		dataType: "json",
		async: false
    }).responseText;
}

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

/*
	Get stats from server
*/
function getStats(url) {
	var encoded_url = encodeURIComponent(url);
	var req_url = sprintf("%s/ext/getStats?url=%s", baseUrl, encoded_url);
	return $.ajax({
		type: "GET",
		url: req_url,
		dataType: "json",
		async: false
    }).responseText;
}


/* Post chat message to server 
*/

function postMessage(message, url) {
	var active_tab = getActiveTab();
	var req_url = sprintf("%s/api/v1/history-data", baseUrl);
	
	active_tab.user = user.getResourceURI();
    active_tab.src = "chrome";
	active_tab.message = message;
	data = JSON.stringify(active_tab);
	
	console.log(data);
	$.ajax({
        type: "POST",
        url: req_url,
        data: data,
        dataType: "text",
        processData:  false,
        contentType: "application/json",	
        error: function(jqXHR, textStatus, errorThrown){
        	console.log(jqXHR);
        	console.log(textStatus);
        	console.log(errorThrown);
            },
		success: function(data) {
			populateFeed();
			$("#messagebox").val("");
		}
    });

}

/* Post chat message to server 
*/

function postChatMessage(userURI, message, url) {
	var g_user = user.get("resourceURI");
	var req_url = sprintf("%s/api/v1/chatmessages", baseUrl);
	var date = moment();
	var data = {
		url: url,
		from_user: g_user,
		to_user: userURI,
		message: message,
		date: date,
		read: 0,
		};
	data = JSON.stringify(data);
	console.log(data);
	$.ajax({
        type: "POST",
        url: req_url,
        data: data,
        dataType: "text",
        processData:  false,
        contentType: "application/json",	
        error: function(jqXHR, textStatus, errorThrown){
        	console.log(jqXHR);
        	console.log(textStatus);
        	console.log(errorThrown);
            },
		success: function(data) {
			populateChatMessageBox();
			$("#textbox").val("");
		}
    });

}

/*
 * Get info on the current tab open
 */

function getActiveTab() {
	var date_diff = 2; //minutes
	var curr_date = new Date();
	var end_date = new Date(curr_date.getTime() + date_diff*60000);
	var total_time = date_diff*60000;
	activeItem = {
        "url" : window.g_url,
        "favIconUrl" : window.g_favIcon,
        "title" : window.g_title,
        "start_event" : 'user_push',
        "start_time" : curr_date,
        "end_time" : end_date,
        "total_time" : total_time,
        "end_event" : 'user_push_end',
        "humanize_time" : '2 minutes',
    };
	return activeItem;
}

/*
	Get messages between two users given the page they are both on
*/
function getMessages(url, username) {
	var g_user = user.get("username");
	var encoded_url = encodeURIComponent(url);
	
	var req_url = sprintf("%s/api/v1/chatmessages?format=json&url=%s&username1=%s&username2=%s", baseUrl, encoded_url, g_user, username);
	return $.ajax({
		type: "GET",
		url: req_url,
		dataType: "json",
		async: false
    }).responseText;
}


///////////////////URL BUILDERS///////////////////
function url_login() {
    return baseUrl + "/accounts/login/";
}

function url_logout() {
    return baseUrl + "/accounts/logout/";
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
    $("#home_tab").click(function(){
        if (homeView !== undefined) {
        	$(document.html).css({"height": "550px"});
            homeView.render();
        }
    });
    $("a").click(clickHandle);
});