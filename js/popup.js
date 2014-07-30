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
        author: null,
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
		var pic_url = this.model.get('pic_url');
		
		if (messages.length > 0) {
			var code_str = "";
			$.each(messages, function(index, message) {
				var time_str = message.post_time.substring(0,10) + ' ' + message.post_time.substring(11,19) + ' UTC';
				var time = new Date(time_str);
				var hum_time = moment(time).fromNow();
				code_str += '<div class="pagefeed_item"><span class="pagefeed_text"> ' +
				'<a target="_blank" href="' + baseUrl + '/users/' + username + '">' + 
				 '<img align="left" src="' + pic_url + 
				 '" title="' + username + 
				 '" class="nav-prof-img2 img-rounded"></a>' + 
				message.message + '<div class="right">' + 
				'<span class="message-name"><a target="_blank" href="' + baseUrl + '/users/' + username + '">' + username + '</a></span> ' +
				'<span class="date">' + hum_time + '</span> </div></span></div>';
			});
			this.$el.html(code_str);
		} else {
			var time_str = this.model.get('start_time').substring(0,10) + ' ' + this.model.get('start_time').substring(11,19) + ' UTC';
			var time = new Date(time_str);
			var hum_time = moment(time).fromNow();
			this.$el.html('<div class="pagefeed_item2"><div class="right">' +
			'<span class="message-name"><a target="_blank" href="' + baseUrl + '/users/' + username + '">' + username + '</a></span> ' +
			'<span class="date">was here ' + hum_time + '</span></div></div>');
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
		var username = this.model.get('username');
		code = code + '<a target="_blank" href="' + baseUrl + '/users/' + username + '">' +
			 '<img src="' + this.model.get('pic_url') + 
			 '" title="' + username + 
			 '" class="nav-prof-img img-rounded"> <span class="name">' + 
			 username + '</span></a></div>';
		
		this.$el.html(code);
		
		if ((window.selected_user != null && window.selected_user != undefined) &&
			(this.model.get('username') == window.selected_user.get('username'))) {
			$(this.el).css('padding', '0px');
			$(this.el).css('border', 'solid 2px #e5b75b');
		}
		return this;
	},
	events: {
		'hover': "hoverUser"
	},
	hoverUser: function(event) {
		$(".chatuser_pic").css('cursor', 'pointer');
	},
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
		var date = this.model.get('date');
		var time_str = date.substring(0,10) + ' ' + date.substring(11,19) + ' UTC';
		var time = new Date(time_str);
		var hum_time = moment(time).fromNow();
		if (this.model.get('author') == user.get('username')) {
			this.$el.html('<div class="my_message"><div class="message-text">' + this.model.get('message') + '</div>' +
			'<div class="date">' + hum_time + '</div></div>');
		} else {
			this.$el.html('<div class="their_message"><div class="message-text">' + 
			this.model.get('message') + '</div>' +
			'<div class="date">' +
			'<a target="_blank" href="' + baseUrl + '/users/' + this.model.get('author') + '">' + this.model.get('author') + '</a> ' +
			hum_time + '</div></div>');
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
		
		var domain = window.g_url.match(/^[\w-]+:\/*\[?([\w\.:-]+)\]?(?::\d+)?/)[1];
			
		this.$el.html('<table class="stat_table"><tr><td><div class="stat_title"><a target="_blank" href="' + window.g_url +'">This Page</a></div>' +
					  '<div class="my_stats">Me: ' + this.model.get('my_count') + ' in ' + this.model.get('my_time') +
					  '<BR />Everyone: ' + this.model.get('total_count') + ' in ' + this.model.get('total_time') + '</div>' +
					  '</td><td><div class="stat_title"><a target="_blank" href="http://' + domain + '">' + domain + '</a></div>' +
					  '<div class="my_stats">Me: ' + this.model.get('my_dcount') + ' in ' + this.model.get('my_dtime') +
					  '<BR />Everyone: ' + this.model.get('total_dcount') + ' in ' + this.model.get('total_dtime') + '</div>' +
					  '</tr></table>');
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
        	populateSubNav();
        	populateStats();
        	window.g_favIcon = tabs[0].favIconUrl;
        	populateActiveUsers();
        	window.setInterval(function() {populateActiveUsers();}, 12000);
        	populateFeed(0);
        	window.setInterval(function() {populateFeed(1);}, 12000);
        	
        	setupMessageBox();
        	populateChatMessageBox(0);
        	window.setInterval(function() {populateChatMessageBox(1);}, 12000);	
	        	
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
		if (text == "Publish a Bulletin to this page and to your Eyebrowse feed simultaneously") {
			text = null;
		}
		postMessage(text, window.g_url);
		});

}

function populateSubNav() {
	$("#userpic").empty().append('<a target="_blank" href="' + baseUrl + '/users/'  + user.get('username') + '"><img class="img-rounded" src="' + baseUrl + '/ext/profilepic"></a>');
	
	$("#username").append(user.get('username'));
	
	$("#navSubLinks").append(' <a href="" id="incognito"></a> | ');
	
	$("#navSubLinks").append(' <a href="" id="mark_visit">Mark a visit to this page</a> | ');

	$("#navSubLinks").append('<a href="" id="whitelist"></a>');
	
	if (user.getIncognito() == true) {
		$("#incognito").text('Incognito: On');
	} else {
		$("#incognito").text('Incognito: Off');
	}
	
	
	if (user.inWhitelist(window.g_url)) {
		$("#whitelist").text("Domain is whitelisted");
		$("#whitelist").css('cursor','default');
		$("#whitelist").css('color','#000000');
	} else {
		$("#whitelist").text("Whitelist this domain");
	}
	
	$("#mark_visit").click(function(e) {
		e.preventDefault();
		postMessage(null, window.g_url);
	});
	
	$("#incognito").click(function(e) {
		e.preventDefault();
		if (user.getIncognito() == false) {
			user.setIncognito(true);
			$("#incognito").text('Incognito: On');
			chrome.browserAction.setIcon({path: '/img/eyes-closed.png'});
			updateBadge('');
			emptyData();
		} else {
			user.setIncognito(false);
			$("#incognito").text('Incognito: Off');
			chrome.browserAction.setIcon({path: '/img/eye-48.png'});
		}
	});
	
	$("#whitelist").click(function(e) {
		e.preventDefault();
		if ($("#whitelist").text() == "Whitelist this domain") {
			var whitelist = user.getWhitelist();
			var uri = new URI(window.g_url);
        	var hostname = uri.hostname();
        	
        	if (!user.inWhitelist(hostname)) {
				m = whitelist.create({
		        	"url" : hostname,
		        	"user" : user.getResourceURI(),
		    	});
		    }

			postMessage(null, window.g_url);
			$("#whitelist").text("Domain is whitelisted");
			$("#whitelist").css('cursor','default');
			$("#whitelist").css('color','#000000');
		}
	});
	
}


//populate chat message box
function populateChatMessageBox(first) {
	var message_text = getMessages(window.g_url);
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
		$("#chatmessage").empty().append('No Chat Messages on this page.');
	}
	
	
	if ( first == 0 ) {
		$('#chatmessage').scrollTop($('#chatmessage')[0].scrollHeight);
	}

	
	$('#textbox').bind("enterKey",function(e){
    	var text = $("#textbox").val();
		postChatMessage(text, window.g_url);
	});
	$('#textbox').keyup(function(e){
		if(e.keyCode == 13){
	  		$(this).trigger("enterKey");
		}
	});
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
	
	var users = parsed["result"]['page'];
	var active_users = [];
	$.each(users, function(index,value) {
		active_users.push(value);
	});
	
	var dusers = parsed["result"]['domain'];
	var active_dusers = [];
	$.each(dusers, function(index,value) {
		active_dusers.push(value);
	});
	
	if (active_users.length == 0 && active_dusers.length == 0) {
		$("#chatuserbox").empty().append("No one currently online");
		window.selected_user = null;
	}
	else {
		var page, domain;
		if (active_users.length != 0) {
			var user_coll = new ChatUserCollection(active_users);
			var user_view = new ChatCollectionView({ collection: user_coll });
	    	var c = user_view.render().el;
	    	page = $('<div class="chattitle">On this page:</div>').append(c);
		} else {
			page = '';
		}
		
	    if (active_dusers.length != 0) {
		    var user_coll = new ChatUserCollection(active_dusers);
			var user_view = new ChatCollectionView({ collection: user_coll });
			var d = user_view.render().el;
			domain = $('<div class="chattitle">On this site:</div>').append(d);
		} else {
			domain = '';
		}
		
	    $("#chatuserbox").empty().append(page).append(domain);  
	}
}

//populate feed for a page
function populateFeed(first) {
	var tab_url = window.g_url;
	var text = getFeed(tab_url);
	var parsed = JSON.parse(text);
	var histories = parsed["objects"];
	var feed_items = [];
	$.each(histories, function(index,value) {
		feed_items.push(value);
	});
	 if (feed_items.length == 0) {
		 $("#pagefeed").empty().append("No activity on this wall.");
	 }
	 else {
		 var feed_coll = new PageFeedCollection(feed_items);
		 var feed_view = new PageFeedCollectionView({ collection: feed_coll });	    
	     var c = feed_view.render().el;
	     $("#pagefeed").empty().append(c);
	 }
	 if (first == 0) {
	 	$("#pagefeed").scrollTop(0);
	 }
}

function clickHandle(e) {
    e.preventDefault();
    console.log(e);
    var a = $(e.target).closest('a');
    var url = $(e.target).closest('a')[0].href;
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


/* Post message to server 
*/

function postMessage(message, url) {
	var active_tab = getActiveTab();
	var req_url = sprintf("%s/api/v1/history-data", baseUrl);
	
	active_tab.user = user.getResourceURI();
    active_tab.src = "chrome";
    if (message != null) {
    	active_tab.message = message;
    }
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
			populateFeed(0);
			$("#messagebox").val("Publish a Bulletin to this page and to your Eyebrowse feed simultaneously");
			$("#messagebox").blur();
		}
    });
}

/* Post chat message to server 
*/

function postChatMessage(message, url) {
	var g_user = user.get("resourceURI");
	var req_url = sprintf("%s/api/v1/chatmessages", baseUrl);
	var date = moment();
	var data = {
		url: url,
		author: g_user,
		message: message,
		date: date,
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
	Get Chat messages on a page
*/
function getMessages(url) {
	var encoded_url = encodeURIComponent(url);
	var req_url = sprintf("%s/api/v1/chatmessages?format=json&url=%s", baseUrl, encoded_url);
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