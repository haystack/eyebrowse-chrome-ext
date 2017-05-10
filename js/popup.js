"use strict";

var user, baseUrl, logged_in, navView, loginView, homeView, valueView, vdView, vcView, vsView, htView;

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
        message: "",
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
    tagName: "div",
    className: "pagefeedline",
    render: function() {
        var username = this.model.get("username");
        var template = _.template($("#page-feed-template").html(), {
            "username": username,
            "user_url": getUserUrl(username),
            "pic_url": this.model.get("pic_url"),
            "message": this.model.get("message"),
            "hum_time": this.model.get("hum_time"),
        });

        this.$el.html(template);
        return this;
    },
});

var PageFeedCollectionView = Backbone.View.extend({
    tagName: "div",
    className: "pagefeedbox",
    render: function() {
        this.collection.each(function(message) {
            var messageView = new PageFeedItemView({
                model: message
            });
            this.$el.append(messageView.render().el);
        }, this);
        return this;
    }
});

var ChatUserView = Backbone.View.extend({
    tagName: "div",
    className: "chatuser_pic",
    render: function() {
        var username = this.model.get("username");
        var template = _.template($("#chat-user-template").html(), {
            "username": username,
            "user_url": getUserUrl(username),
            "pic_url": this.model.get("pic_url"),
            "old_level": this.model.get("old_level"),
            "time_ago": this.model.get("time_ago"),
        });

        this.$el.html(template);
        return this;
    },

    events: {
        "hover": "hoverUser"
    },

    hoverUser: function(event) {
        $(".chatuser_pic").css("cursor", "pointer");
    },
});

var ChatCollectionView = Backbone.View.extend({
    tagName: "div",
    className: "chatuser_row",

    render: function() {
        this.collection.each(function(person) {
            var userView = new ChatUserView({
                model: person
            });
            this.$el.append(userView.render().el);
        }, this);
        return this;
    }
});

var ChatMessageView = Backbone.View.extend({
    tagName: "div",
    className: "chatmessageline",
    render: function() {
        var date = this.model.get("date");
        var time_str = date.substring(0, 10) + " " + date.substring(11, 19) + " UTC";
        var time = new Date(time_str);
        var hum_time = moment(time).fromNow();
        var author = this.model.get("author");
        var message = this.model.get("message");
        var template;
        if (author === user.get("username")) {
            template = _.template($("#own-chat-msg-template").html(), {
                "message": message,
                "hum_time": hum_time,
            });
        } else {
            template = _.template($("#their-chat-msg-template").html(), {
                "author": author,
                "author_url": getUserUrl(author),
                "message": message,
                "hum_time": hum_time,
            });
        }
        this.$el.html(template);
        return this;
    },
});

var ChatMessageCollectionView = Backbone.View.extend({
    tagName: "div",
    className: "chatmessages",

    render: function() {
        this.collection.each(function(message) {
            var messageView = new ChatMessageView({
                model: message
            });
            this.$el.append(messageView.render().el);
        }, this);
        return this;
    }
});

var StatsView = Backbone.View.extend({
    tagName: "div",
    className: "stat_info",
    render: function() {

        var host = getUrlParser(window.g_url).host;
        var template = _.template($("#stats-template").html(), {
            "g_url": window.g_url,
            "my_count": this.model.get("my_count"),
            "my_time": this.model.get("my_time"),
            "total_count": this.model.get("total_count"),
            "total_time": this.model.get("total_time"),
            "host": host,
            "my_dcount": this.model.get("my_dcount"),
            "my_dtime": this.model.get("my_dtime"),
            "total_dcount": this.model.get("total_dcount"),
            "total_dtime": this.model.get("total_dtime"),
        });
        this.$el.html(template);
        return this;
    },
});


var LoginView = Backbone.View.extend({
    "el": $(".content-container"),

    initialize: function() {
        _.bindAll(this);
        this.render();
    },

    render: function() {
        if (!user.isLoggedIn()) {
            user.attemptLogin(function(username) {
                if (username !== null) {
                    completeLogin(username);
                }
            });
            $(".content-container").empty();
            $("body").css("width", "300px");
            $("body").css("height", "190px");
            var template = _.template($("#login_template").html(), {
                "baseUrl": baseUrl,
            });

            $(this.el).html(template);
            $("#errors").fadeOut();
            $("#id_username").focus();
        }
    },

    events: {
        "click #login": "getLogin",
        "keypress #id_username": "filterKey",
        "keypress #id_password": "filterKey"
    },

    filterKey: function(e) {
        if (e.which === 13) { // listen for enter event
            e.preventDefault();
            this.getLogin();
        }
    },

    getLogin: function() {
        $("#errors").fadeOut();
        $("#login").button("loading");
        var self = this;
        var username = $("#id_username").val();
        var g_username = username;
        var password = $("#id_password").val();
        if (username === "" || password === "") {
            self.displayErrors("Enter a username and a password");
        } else {
            if (user.getCSRF() !== "") {
                self.postLogin(user.getCSRF(), username, password);
            } else {
                $.get(getLoginUrl(), function(data) {
                    var csrf = parseCSRFToken(data);
                    if (csrf) {
                        user.setCSRF(csrf);
                        self.postLogin(csrf, username, password);
                    } else {
                        self.completeLogin(username);
                    }
                });
            }
        }
    },

    postLogin: function(csrfmiddlewaretoken, username, password) {
        var self = this;
        // now call the server and login
        user.doLogin(getLoginUrl(), username, password, function(data, success) {
            if (success) {
                var match = data.match(CSRF_REGEX);
                if (match) { // we didn"t log in successfully
                    self.displayErrors("Invalid username or password");
                } else {
                    completeLogin(username);
                }
            } else {
                if (data.status === 401) {
                    self.displayErrors("Invalid username or password");
                } else {
                    self.displayErrors("Unable to connect, try again later."); 
                }
                
            }
        })
    },

    logout: function() {
        $.get(getLogoutUrl());
        user.logout();
        backpage.clearLocalStorage("user");
        $(".content-container").html('<div class="logout-intermediate">'
            +'<i class="fa fa-spinner fa-pulse fa-lg fa-fw"></i>'
            +'<div class="logout-text">Logging you out...</div>'
            +'</div>');
        var this_func = this;
        setTimeout(function() {
            this_func.render();
            navView.render("home_tab");
        }, 1000);
    },

    displayErrors: function(errorMsg) {
        $("#login").button("reset");
        var $errorDiv = $("#errors");
        $errorDiv.html(errorMsg);
        $errorDiv.fadeIn();
    },

});


var NavView = Backbone.View.extend({
    "el": $(".nav-container"),

    initialize: function() {
        this.render("home_tab");
        $(".brand").blur();
    },

    render: function(tab) {
        $(".nav-container").empty();
        var loggedIn = user.isLoggedIn();
        var template = _.template($("#nav_template").html(), {
            baseUrl: baseUrl,
            loggedIn: loggedIn,
        });

        $(this.el).html(template);
        if (!loggedIn) {
            tab = "login_tab";
            $("#" + tab).addClass("active").click();
        }
        $("nav-tab").removeClass("active");
    },
});

var ValueView = Backbone.View.extend({
    "el": $(".content-container"),

    initialize: function() {
        htView = new HighlightToggleView();
    },

    render: function() {
        $(".content-container").empty();
        var loggedIn = user.isLoggedIn();
        var container = $(this.el);

        chrome.tabs.query({
            currentWindow: true,
            active: true
        }, function(tabs) {
            var url = tabs[0].url;

            var page_url = sprintf("%s/tags/page", baseUrl);
            $.get(page_url, {
                "url": url,
            }).done(function(res) {
                var page_info = res.page;
                var name = url;

                if (url.length > 50) {
                    name = url.substring(0, 50) + "...";
                } 

                if (page_info.domain) {
                    if (page_info.domain.name !== "") {
                        name = page_info.domain.name;
                    }
                }

                var value_title_template = _.template($("#value_title_template").html(), {
                    page: {
                        "title": tabs[0].title,
                        "favicon": tabs[0].favIconUrl,
                        "domain": {
                            "name": name,
                        },
                    },
                });
                container.html(value_title_template);

                var summary = ""
                vdView = new ValueDisplayView(url, loggedIn);
                vcView = new ValueCompView(url, loggedIn);
                vsView = new ValueSummaryView(url, loggedIn, summary);

                vdView.render();
                
                var tags_by_page_url = sprintf("%s/tags/tags/page", baseUrl);
                $.get(tags_by_page_url, {
                  "url": url,
                }).done(function(res) {
                    if (Object.keys(res.tags).length === 0) {
                        vsView.render();
                    }
                });
            });
        });
    }
});

var ValueDisplayView = Backbone.View.extend({
    "el": $(".content-container"),
    "url": "",
    "loggedIn": false,

    initialize: function(url, loggedIn) {
        this.url = url;
        this.loggedIn = loggedIn;
        // this.render(url, loggedIn);
    },

    render: function() {
        var container = $(this.el);
        var page_url = this.url;

        if (!user.isLoggedIn()) {
            return;
        }

        var tags_by_page_url = sprintf("%s/tags/tags/page", baseUrl);
        $.get(tags_by_page_url, {
          "url": page_url,
        }).done(function(res) {
            var valueTags = res.tags;
            var subtitle = '';
            var auto_header_text = "Auto-generated framings";
            var user_header_text = "User-tagged framings";
            var auto_tags = {}

            if (Object.keys(valueTags).length > 0) {
                subtitle = "This page is framed under the following tags:"; 
            } else {
                subtitle = "No tags to display :(";
            }

            var value_display_template = _.template($("#value_display_template").html(), {
                subtitle_text: subtitle,
                auto_header_text: auto_header_text,
                user_header_text: user_header_text
            });
            $(".value_content").html(value_display_template);

            if (Object.keys(valueTags).length === 0) {
                $('.autogenerated_values').html('');
            }

            for (var val in valueTags) {
                var tag_info = valueTags[val]
                auto_tags[tag_info.name] = true;
                tag_info.name = tag_info.name[0].toUpperCase() + tag_info.name.substring(1, tag_info.name.length)

                var template = _.template($("#value_template").html(), {
                    loggedIn: this.loggedIn,
                    value: tag_info,
                    color: tag_info.color,
                });
                $(".autogenerated_values").append(template);
            }

            var user_tags = {}
            var highlights_by_page = sprintf("%s/tags/highlights", baseUrl);
            var tags_by_highlight = sprintf("%s/tags/tags/highlight", baseUrl);
            $.get(highlights_by_page, {
                "url": page_url,
            }).done(function(res) {
                if (res.success) {
                    var count = _.size(res.highlights);

                    if (count === 0) {
                        $('.usergenerated_values').html('');
                    } 
                    $.each(res.highlights, function(hl, hl_info) {
                        $.get(tags_by_highlight, {
                            url: page_url,
                            highlight: hl_info.id,
                        }).done(function(res) {
                            if (res.success) {
                                for (var tag in res.tags) {
                                    user_tags[res.tags[tag].name] = res.tags[tag];
                                    if (res.tags[tag].name in auto_tags) {
                                        var tag_info = res.tags[tag];
                                        tag_info.name = tag_info.name[0].toUpperCase() + tag_info.name.substring(1, tag_info.name.length)
                                        var dupe_tag = $('.autogenerated_values').find("." + tag_info.name).parent();
                                        dupe_tag.remove();

                                        if ($('.autogenerated_values').children().length === 1) {
                                            $('.autogenerated_values .subtitle').remove();
                                        }
                                    }
                                }
                            }

                            if (!--count) {
                                if (_.size(user_tags) === 0) {
                                    $('.usergenerated_values').html('');
                                } 
                                for (var val in user_tags) {
                                    var tag_info = user_tags[val];
                                    tag_info.name = tag_info.name[0].toUpperCase() + tag_info.name.substring(1, tag_info.name.length)

                                    var template = _.template($("#value_template").html(), {
                                        loggedIn: this.loggedIn,
                                        value: tag_info,
                                        color: tag_info.color,
                                    });
                                    $(".usergenerated_values").append(template);
                                    $(".value_subtext").html("");
                                }
                            }
                        });
                    });
                }
            });

            var htView = new HighlightToggleView();
        });
    }
});

var ValueCompView = Backbone.View.extend({
    "el": $(".content-container"),
    "url": "",

    initialize: function(url, loggedIn) {
        this.url = url;
        // this.render(url, loggedIn);
    },

    render: function() {
        var container = $(this.el);

        if (!user.isLoggedIn()) {
            return;
        }

        var value_comp_template = _.template($("#value_comp_template").html());
        $(".value_content").html(value_comp_template);
        $(".value_comps").html('<i style="margin-top: 30px;" class="fa fa-spinner fa-pulse fa-lg fa-fw"></i>' 
            + '<div class="comp_wait_message" style="margin-top: 10px; margin-bottom: 30px; font-size: 12px;">Hang tight... fetching recommended pages</div>');

        var related_stories_url = sprintf("%s/tags/page/related_stories", baseUrl);
        $.get(related_stories_url, {
          "url": this.url,
        }).done(function(res) {
          var related_stories = res.data;
          $(".value_comps").html("");

          if (Object.keys(related_stories).length === 0) {
            $(".value_comps").html("<div style='margin: 15px 0'>No recommended articles to display</div>");
          }

          $.each(related_stories, function(id, story) {
            var summary = story.summary;

            if (summary.length > 150) {
                summary = summary.substring(0, 150);
                summary += "..."
            } 

            var initialize_page_url = sprintf("%s/tags/initialize_page", baseUrl);
            $.post(initialize_page_url, {
                "url": story.link,
                "domain_name": story.domain,
                "title": story.title,
                "favIconUrl": "",
                "add_usertags": "false",
                "csrfmiddlewaretoken": user.csrf,
            }).done(function(res) {
                var valuetags = res.tags
                var hl_text = "0 highlights";
                if (res.highlights === 1) {
                    hl_text = "1 highlight";
                } else if (res.highlights > 1) {
                    hl_text = res.highlights.toString() + " highlights";
                }
                var template = _.template($("#relatedstories_template").html(), {
                    id: id,
                    link: story.link,
                    logo: story.logo,
                    title: story.title,
                    source: story.source,
                    summary: summary,
                    value_tags: valuetags,
                });
                $(".value_comps").append(template);
            });
          });
        });
    }
});

var ValueSummaryView = Backbone.View.extend({
    "el": $(".content-container"),
    "url": "",
    "maxLen": 1000,
    "lastSummary": "",

    initialize: function(url, loggedIn) {
        this.url = url;
        // this.render(url, loggedIn);
        this.maxLen = 1000;
        self.lastSummary = "";
    },

    render: function() {
        var container = $(this.el);

        if (!user.isLoggedIn()) {
            return;
        }

        var page_url = this.url;
        $.get(baseUrl + "/tags/page/summary", {
            "url": this.url,
        }).done(function(res) {
            var editor, time;
            var summary = '<p class="default-message">No summary yet... start writing one here! </p><p>Summarize the perspective of the page content here.</p>';
            if (res.data.summary.summary !== "") {
                summary = res.data.summary.summary;
                editor = res.data.summary.user;
                time = res.data.summary.date;

                self.lastSummary = summary;
            } else {
                editor = 'no one';
                time = 'n/a';
            }

            var page_tags = {}
            var tags_by_page_url = sprintf("%s/tags/tags/page", baseUrl);
            $.get(tags_by_page_url, {
              "url": page_url,
            }).done(function(res) {
                for (var t in res.tags) {
                    page_tags[t] = res.tags[t];
                }

                var highlights_by_page = sprintf("%s/tags/highlights", baseUrl);
                var tags_by_highlight = sprintf("%s/tags/tags/highlight", baseUrl);
                $.get(highlights_by_page, {
                    "url": page_url,
                }).done(function(res) {
                    if (res.success) {
                        $.each(res.highlights, function(hl, hl_info) {
                            $.get(tags_by_highlight, {
                                url: page_url,
                                highlight: hl_info.id,
                            }).done(function(res) {
                                for (var t in res.tags) {
                                    page_tags[res.tags[t].name] = res.tags[t];
                                }

                                var value_summary_template = _.template($("#value_summary_template").html(), {
                                    'summary': summary,
                                    'editor': editor,
                                    'time': time,
                                    'count': 1000 - summary.length,
                                    'value_tags': page_tags,
                                });
                                $(".value_content").html(value_summary_template);
                            });
                        });

                        var value_summary_template = _.template($("#value_summary_template").html(), {
                            'summary': summary,
                            'editor': editor,
                            'time': time,
                            'count': 1000 - summary.length,
                            'value_tags': page_tags,
                        });
                        $(".value_content").html(value_summary_template);
                    }
                });
            });
        });
    },

    events: {
        "input .value_summary_text": "updateCounter",
        "click .fa-pencil": "editSummary",
        "click .summary_exit_edit": "exitEditMode",
        "click .summary_reset": "resetSummary",
        "click .summary_submit": "postSummary",
        "mouseenter .value_summary_wrapper": "hoverShow",
        "mouseleave .value_summary_wrapper": "hoverHide",
        "mouseenter .value_summary_edit": "addTooltip",
        "mouseleave .value_summary_edit": "removeTooltip",
    },

    addTooltip: function(e) {
        if ($(e.target).children(".fa-pencil").length > 0) {
            var tooltip = $("<span>", {"class": "icon-name-tooltip"});
            tooltip.html("Edit this globally viewable summary");
            $(e.target).append(tooltip);
            var top = $(e.target).offset().top - tooltip.height() - 18;
            var left = $(e.target).offset().left - tooltip.width() + 6;
            tooltip.css({
                top: top,
                left: left,
            });
        }
    },

    removeTooltip: function(e) {
        if ($(".icon-name-tooltip").length !== 0) {
          $(".icon-name-tooltip").remove();
        }
    },

    hoverShow: function(e) {
        $(".value_summary_edit").css({
            "display": "block"
        });
    },

    hoverHide: function(e) {
        $(".value_summary_edit").css({
            "display": "none",
        });
    },

    editSummary: function(e) {
        if ($(".value_summary_text").attr("contenteditable") !== "true" && !$(".value_summary_edit").hasClass("edit-mode")) {
            if ($(".value_summary_text").children('.default-message').length > 0) {
            $(".value_summary_text").html("");
        }

            $(".value_summary_text").attr("contenteditable", true);
            $(".value_summary_text").get(0).focus();
            $(".value_summary_edit").addClass("edit-mode");
            $(".value_summary_edit").html("<div class='summary_reset disabled'>Reset</div><div class='summary_exit_edit'>Exit edit mode</div><div class='summary_submit'>Submit this summary</div>");
        } 
    },

    exitEditMode: function(e) {
        if ($(".value_summary_text").attr("contenteditable") === "true") {
            $(".value_summary_text").html(self.lastSummary);
            $(".value_summary_text").attr("contenteditable", false);
            $(".value_summary_text").blur();
            $(".value_summary_edit").html('<i class="fa fa-pencil" aria-hidden="true"></i>');
            $('.value_summary_helpertext').html("");
            $(".value_summary_edit").removeClass("edit-mode");
        }
    },

    resetSummary: function(e) {
        if (!$(".summary_reset").hasClass("disabled")) {
            $('.value_summary_helpertext').html("");
            $(".value_summary_text").html(self.lastSummary);
            $(".summary_reset").addClass("disabled");
        }
    },

    updateCounter: function(e) {
        var text = $('.value_summary_text').get(0).textContent
        var count = this.maxLen - text.length;

        $(".summary_reset").removeClass("disabled");

        $('.value_summary_helpertext').html("Unsubmitted changes");
        $('.value_summary_helpertext').css({
            opacity: 1,
        });

        if (count <= 0) {
            $('.value_summary_helpertext').addClass("danger");
            $('.value_summary_helpertext').html("Too many characters");
        } else {
            $('.value_summary_helpertext').removeClass("danger");
        }

        if (count < 50) {
            $('.value_summary_counter').addClass("danger");
        } else {
            $('.value_summary_counter').removeClass("danger");
        }

        $('.value_summary_counter #count').html((count).toString());
    },

    postSummary: function(e) {
        var count = this.maxLen - $('.value_summary_text').get(0).textContent.length;

        if (count >= 0) {
            var summary = $('.value_summary_text').get(0).textContent;

            if (!/\S/.test(summary)) {
                $('.value_summary_helpertext').html("<span class='danger'>Summary cannot be blank</span>");
            } else {
                $('.value_summary_helpertext').html('<i class="fa fa-spinner fa-pulse fa-lg fa-fw"></i>');
                $.post(baseUrl + "/tags/page/summary", {
                    "url": this.url,
                    "summary": summary,
                    "csrfmiddlewaretoken": user.csrf,
                }).done(function(res) {
                    if (res.success) {
                        self.lastSummary = summary;
                        window.getSelection().removeAllRanges();
                        $('.value_summary_text').blur();
                        $('.value_summary_text').attr('contenteditable', false);
                        $('#edited_user').html(res.data.summary.user);
                        $('#edited_time').html(res.data.summary.date);
                        $(".value_summary_edit").removeClass("edit-mode");
                        $(".value_summary_edit").html('<i class="fa fa-pencil" aria-hidden="true"></i>');
                        $('.value_summary_helpertext').html("Success - summary saved! 🎉");
                        $('.value_summary_helpertext').animate({
                            opacity: 1,
                        }, 300);
                        setTimeout(function() {
                            $('.value_summary_helpertext').animate({
                                opacity: 0,
                            }, 300);
                        }, 2000);
                    } else {
                        $('.value_summary_helpertext').html("Saving summary failed");
                        $('.value_summary_helpertext').addClass("danger");

                        setTimeout(function() {
                            $('.value_summary_helpertext').animate({
                                opacity: 0,
                            }, 300);
                            $('.value_summary_helpertext').removeClass("danger");
                        }, 2000);
                    }
                    
                });
            }
            
        }
    }
})

var HighlightToggleView = Backbone.View.extend({
    initialize: function() {
        this.render();
    },

    render: function() {
        var state_text = user.getHighlighting() ? "Turn off " : "Turn on ";
        var class_name = user.getHighlighting() ? "turn_off" : "turn_on";

        var highlight_template = _.template($("#highlight_toggle_template").html(), {
            "state": state_text,
            "class_name": class_name,
        });
        
        $(".value_highlight_btn").html(highlight_template);
    }
});

var HomeView = Backbone.View.extend({
    "el": $(".content-container"),

    initialize: function() {
        this.render();
    },

    render: function() {
        if (!user.isLoggedIn()) {
            return;
        }
        chrome.tabs.query({
            currentWindow: true,
            active: true
        }, function(tabs) {
            window.g_url = tabs[0].url;
            window.g_title = tabs[0].title;
            populateSubNav();
            
            populateStats();
            window.g_favIcon = tabs[0].favIconUrl;
            populateActiveUsers();
            window.setInterval(function() {
                populateActiveUsers();
            }, 12000);
            populateFeed(0);
            window.setInterval(function() {
                populateFeed(1);
            }, 12000);

            setupMessageBox();
            populateChatMessageBox(0);

            setupMentionAutocomplete();

            window.setInterval(function() {
                populateChatMessageBox(1);
            }, 12000);

        });

        var template = _.template($("#splash_template").html());
        $(this.el).html(template);
    },
});

function setupMentionAutocomplete() {
    $("textarea.mention").mentionsInput({
        onDataRequest: function(mode, query, callback) {
            var req_url = sprintf("%s/ext/getFriends?query=%s", baseUrl, query);
            $.getJSON(req_url, function(responseData) {
                callback.call(this, responseData.res);
            });
        }
    });
}

function completeLogin(username) {
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
        success: function(data) {
            user.saveState();
        }
    });
    user.getWhitelist().fetch({
        success: function(data) {
            user.saveState();
        }
    });
}

function setupMessageBox() {
    $("#messagebox")
        .focus(function() {
            if (this.value === this.defaultValue) {
                this.value = "";
            }
        })
        .blur(function() {
            if (this.value === "") {
                this.value = this.defaultValue;
            }
        });

    $("#messagebox").keypress(function(e) {
        if (e.which === 13) {
            var text = $("#upperarea .mentions").text();
            postMessage(text, window.g_url);
        }
    });

    $("#submitmessage").click(function(e) {
        var text = $("#upperarea .mentions").text();
        if (text === "") {
            text = null;
        }
        postMessage(text, window.g_url);
    });
}

function populateSubNav() {
    $("#userpic").empty().append("<a target='_blank' href='" + getUserUrl(user.get("username")) + "'><img class='img-rounded' src='" + baseUrl + "/ext/profilepic'></a>");

    $("#username").append(user.get("username"));

    $("#navSubLinks").append(" <a href='' id='incognito'></a> | ");

    $("#navSubLinks").append(" <a href='' id='mark_visit'>Mark visit to this page</a> | ");

    $("#navSubLinks").append("<a href='' id='whitelist'></a>");

    if (user.getIncognito() === true) {
        $("#incognito").html("<span class='red'>Eyebrowse Off</span>");
    } else {
        $("#incognito").html("<span class='green'>Eyebrowse On</span>");
    }


    if (user.inWhitelist(window.g_url)) {
        $("#whitelist").text("Domain is shared");
        $("#whitelist").css("cursor", "default");
        $("#whitelist").css("color", "#000000");
    } else {
        $("#whitelist").text("Share this domain");
    }

    $("#mark_visit").click(function(e) {
        e.preventDefault();
        postMessage(null, window.g_url, function(data) {
            $("#mark_visit").replaceWith("Page Marked");
        });
    });

    $("#incognito").click(function(e) {
        e.preventDefault();
        if (user.getIncognito() === false) {
            user.setIncognito(true);
            $("#incognito").html("<span class='red'>Eyebrowse Off</span>");
            $(".logo").attr("src", "/img/eyes-closed.png");
            chrome.browserAction.setIcon({
                path: "/img/eyes-closed.png"
            });
            chrome.browserAction.setBadgeText({
                "text": ""
            });
            emptyData();
        } else {
            user.setIncognito(false);
            $("#incognito").html("<span class='green'>Eyebrowse On</span>");
            $(".logo").attr("src", "/img/eye.png");
            chrome.browserAction.setIcon({
                path: "/img/eye.png"
            });
        }
    });

    $("#whitelist").click(function(e) {
        e.preventDefault();
        if ($("#whitelist").text() === "Share this domain") {
            var whitelist = user.getWhitelist();
            var uri = new URI(window.g_url);
            var hostname = uri.hostname;

            if (!user.inWhitelist(hostname)) {
                whitelist.create({
                    "url": hostname,
                    "user": user.getResourceURI(),
                });
            }

            postMessage(null, window.g_url, function() {
                $("#whitelist").text("Domain is shared");
                $("#whitelist").css("cursor", "default");
                $("#whitelist").css("color", "#000000");
            });
        }
    });

}


// populate chat message box
function populateChatMessageBox(first) {
    getMessages(window.g_url, first);
}


// get all the stats for a page and domain and populate the view
function populateStats() {
    var tab_url = window.g_url;
    getStats(tab_url);
}


// get all the active users on a page and populate the view
function populateActiveUsers() {
    var tab_url = window.g_url;
    getActiveUsers(tab_url);
}

// populate feed for a page
function populateFeed(first) {
    var tab_url = window.g_url;
    getFeed(tab_url, first);
}

function clickHandle(e) {
    e.preventDefault();
    var a = $(e.target).closest("a");
    var url = $(e.target).closest("a")[0].href;
    if (url.indexOf("logout") !== -1) {
        loginView.logout();
    } else if (url.indexOf("http") !== -1) {
        backpage.openLink(url);
    } else if (url.indexOf("login") !== -1) {
        return;
    } else {
        url = url.split("#")[1];
        user.setTab(url);
        subNavView.render();
    }
}


////////////// AJAX CSRF PROTECTION///////////

/*
 * Ajax CSRF protection
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
    return (url === origin || url.slice(0, origin.length + 1) === origin + "/") ||
        (url === sr_origin || url.slice(0, sr_origin.length + 1) === sr_origin + "/") ||
    // or any other URL that isn"t scheme relative or absolute i.e relative.
    !(/^(\/\/|http:|https:).*/.test(url));
}

function ajaxSetup(csrftoken) {
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
 * Get Activity Feed from server
 */

function getFeed(url, first) {
    var encoded_url = encodeURIComponent(url);
    var req_url = sprintf("%s/ext/getMessages?url=%s", baseUrl, encoded_url);
    return $.ajax({
        type: "GET",
        url: req_url,
        dataType: "json"
    }).done(function(parsed) {
	    var histories = parsed.result.messages;
	    var feed_items = [];
	    $.each(histories, function(index, value) {
	        feed_items.push(value);
	    });
	    if (feed_items.length === 0) {
	        $("#pagefeed").empty().append("No bulletins yet.");
	    } else {
	        var feed_coll = new PageFeedCollection(feed_items);
	        var feed_view = new PageFeedCollectionView({
	            collection: feed_coll
	        });
	        var c = feed_view.render().el;
	        $("#pagefeed").empty().append(c);
	    }
	    if (first === 0) {
	        $("#pagefeed").scrollTop(0);
	    }
    });
}

/*
 * Get active users from server
 */
function getActiveUsers(url) {
    var encoded_url = encodeURIComponent(url);
    var req_url = sprintf("%s/ext/getActiveUsers?url=%s", baseUrl, encoded_url);
    $.ajax({
        type: "GET",
        url: req_url,
        dataType: "json"
    }).done(function(parsed) {

	    var users = parsed.result.page;
	    var active_users = [];
	    $.each(users, function(index, value) {
	        active_users.push(value);
	    });
	
	    var dusers = parsed.result.domain;
	    var active_dusers = [];
	    $.each(dusers, function(index, value) {
	        active_dusers.push(value);
	    });
	
	    if (active_users.length === 0 && active_dusers.length === 0) {
	        $("#chatuserbox").empty().append("No one's been here recently");
	        window.selected_user = null;
	    } else {
	        var page, domain, user_coll, user_view;
	        if (active_users.length !== 0) {
	            user_coll = new ChatUserCollection(active_users);
	            user_view = new ChatCollectionView({
	                collection: user_coll
	            });
	            var c = user_view.render().el;
	            page = $("<div class='chattitle'><span class='chatheader'>On this page</span></div>").append(c);
	        } else {
	            page = "";
	        }
	
	        if (active_dusers.length !== 0) {
	            user_coll = new ChatUserCollection(active_dusers);
	            user_view = new ChatCollectionView({
	                collection: user_coll
	            });
	            var d = user_view.render().el;
	            domain = $("<div class='chattitle'>On this site:</div>").append(d);
	        } else {
	            domain = "";
	        }
	
	        $("#chatuserbox").empty().append(page).append(domain);
	    }
	    	
    	
    });
}

/*
 * Get stats from server
 */
function getStats(url) {
    var encoded_url = encodeURIComponent(url);
    var req_url = sprintf("%s/ext/getStats?url=%s", baseUrl, encoded_url);
    return $.ajax({
        type: "GET",
        url: req_url,
        dataType: "json"
    }).done(function(parsed) {
    	var title = window.g_title;
	    var values = parsed.result;
	    var stats = new Stats(values);
	    var statview = new StatsView({
	        model: stats
	    });
	    var c = statview.render().el;
	    $("#stats").empty().append(c);
    });
}


/* Post message to server
 */

function postMessage(message, url, successCallback) {
    var active_tab = getActiveTab();
    var req_url = sprintf("%s/api/v1/history-data", baseUrl);

    active_tab.user = user.getResourceURI();
    active_tab.src = "chrome";
    if (message !== null) {
        active_tab.message = message;
    }
    var data = JSON.stringify(active_tab);

    $.ajax({
        type: "POST",
        url: req_url,
        data: data,
        dataType: "text",
        processData: false,
        contentType: "application/json",
        error: function(jqXHR, textStatus, errorThrown) {
            logErrors(jqXHR, textStatus, errorThrown);
            loginView.logout();
        },
        success: function(data) {
            populateFeed(0);
            $("#messagebox").val("");
            $("#upperarea .mentions").html("<div></div>");
            $("#messagebox").blur();

            var hl_url = sprintf("%s/tags/initialize_page", baseUrl);
            $.post(hl_url, {
                url: active_tab.url,
                favIconUrl: active_tab.favIconUrl,
                title: active_tab.title,
                add_usertags: true,
                domain_name: null,
                csrfmiddlewaretoken: user.getCSRF(),
            }).done(function(res) {
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                  chrome.tabs.sendMessage(tabs[0].id, {
                    "type": "initialize_page",
                    "page_url": tabs[0].url,
                    "user": user,
                  });
                });
            });

            if (successCallback) {
                successCallback(data);
            }
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
    $.ajax({
        type: "POST",
        url: req_url,
        data: data,
        dataType: "text",
        processData: false,
        contentType: "application/json",
        error: function(jqXHR, textStatus, errorThrown) {
            logErrors(jqXHR, textStatus, errorThrown);
            loginView.logout();
        },
        success: function(data) {
            populateChatMessageBox(1);
            $("#chatmessage").scrollTop($("#chatmessage")[0].scrollHeight);
            $("#textbox").val("");
            $("#lowerarea .mentions").html("<div></div>");
        }
    });

}

/*
 * Get info on the current tab open
 */

function getActiveTab() {
    var date_diff = 2; // minutes
    var curr_date = new Date();
    var end_date = new Date(curr_date.getTime() + date_diff * 60000);
    var total_time = date_diff * 60000;
    return {
        "url": window.g_url,
        "favIconUrl": window.g_favIcon,
        "title": window.g_title,
        "start_event": "user_push",
        "start_time": curr_date,
        "end_time": end_date,
        "total_time": total_time,
        "end_event": "user_push_end",
        "humanize_time": "2 minutes",
    };
}

/*
  Get Chat messages on a page
*/
function getMessages(url, first) {
    var encoded_url = encodeURIComponent(url);
    var req_url = sprintf("%s/api/v1/chatmessages?format=json&url=%s", baseUrl, encoded_url);
    return $.ajax({
        type: "GET",
        url: req_url,
        dataType: "json"
    }).done(function(parsed){
    	var parsed = parsed.objects;
	    var messages = [];
	    $.each(parsed, function(index, value) {
	        value.message = createMentionTag(value.message);
	        messages.push(value);
	    });
	    if (messages.length !== 0) {
	        var messages_coll = new ChatMessageCollection(messages);
	        var messages_view = new ChatMessageCollectionView({
	            collection: messages_coll
	        });
	
	        var c = messages_view.render().el;
	        $("#chatmessage").empty().append(c);
	    } else {
	        $("#chatmessage").empty().append("No Chat Messages on this page.");
	    }
	
	
	    if (first === 0) {
	        $("#chatmessage").scrollTop($("#chatmessage")[0].scrollHeight);
	
	        $("#textbox").bind("enterKey", function(e) {
	            var text = $("#lowerarea .mentions").text();
	            postChatMessage(text, window.g_url);
	        });
	        $("#textbox").keyup(function(e) {
	            if (e.keyCode === 13) {
	                $(this).trigger("enterKey");
	            }
	        });
	    }
    	
    	
    });
}


$(document).ready(function() {
    window.backpage = chrome.extension.getBackgroundPage();
    user = backpage.user;

    logged_in = user.isLoggedIn();

    baseUrl = backpage.baseUrl;
    navView = new NavView();
    loginView = new LoginView(); // (presumably) calls initialization
    valueView = new ValueView();

    /////setup funcs///////
    chrome.cookies.get({
        "name": "csrftoken",
        "url": baseUrl
    }, function(cookie) {
        ajaxSetup(cookie.value);
    });

    if (logged_in) {
        homeView = new HomeView();
    }
    $("#home_tab").click(function() {
        if (homeView !== undefined) {
            $(document.html).css({
                "height": "580px"
            });
            homeView.render();
            $("#home_tab").addClass("active");
            $("#values_tab").removeClass("active");
        }
    });

    $("#values_tab").click(function() {
        if (valueView !== undefined) {
            valueView.render();
            $("#values_tab").addClass("active");
            $("#home_tab").removeClass("active");
        }
    });

    $("body").on("click", ".value_tab_nav li", function() {
        if ($(this).hasClass("value_comp")) {
            if (vcView !== undefined) {
                vcView.render();
            }
        } else if ($(this).hasClass("value_framing")) {
            if (vdView != undefined) {
                vdView.render();
            }
        } else if ($(this).hasClass("value_summary")) {
            if (vsView != undefined) {
                vsView.render();
            }
        }
    });

    $("body").on("click", ".highlighting_toggle", function() {
        var state = !user.getHighlighting();
        user.setHighlighting(state);
        user.saveState();

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            "type": "toggleHighlight",
            "user": user,
            "baseUrl": baseUrl,
          });
        });

        htView.render();
    });

    $("body").on("click", ".story_container", function() {
        var link = $(this).attr("link");

        // Log recommended story click
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            var url = tabs[0].url;
            $.post(baseUrl + "/stats/click_item", {
                url_click: link,
                url_refer: url,
                csrfmiddlewaretoken: user.getCSRF(),
                recommendation: true,
            }).done(function(res) {
                chrome.tabs.create({ url: link });
            });
        });
    });

    $("a").click(clickHandle);
});
