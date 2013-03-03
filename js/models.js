
//This object can represent either a whitelist or blacklist for a given user. On an update send results to server to update stored data. On intialization set is synced with server. Should allow offline syncing in the future.
var FilterListItem = Backbone.Model.extend({
    parse: function(data) {
        if (data !== null) {
            return {
                url : data.url, 
                id : data.id,
            }
        }
    },
});


var FilterList = Backbone.Collection.extend({

    model: FilterListItem,

    initialize: function(type) {
        _.bindAll(this);
        this.type = type;
        this._fetch();
    },

    getType : function() {
        return this.get("type")
    },

    url : function() {
        return getApiURL(this.type)
    },

    parse: function(data, res){
        if (res.status === 200) {
            return data.objects;    
        }
    },

    //wrapper for fetch which logs user out if server errs
    _fetch: function() {
        this.fetch({
            error: _.bind(function(model, xhr, options) {
                user.logout();
            }, this)
        });
    },
});


//User object holds the status of the user, the cookie from the server, preferences for eyebrowse, whitelist, blacklist, etc
var User = Backbone.Model.extend({
    defaults: {
        "loggedIn" : false,
        "whitelist" : new FilterList("whitelist"),
        "blacklist" : new FilterList("blacklist"),
        "username" : "",
        "resourceURI" : "/api/v1/user/",
    },

    initialize : function() {
        _.bindAll(this); //allow access to 'this' in callbacks with "this" meaning the object not the context of the callback

    },

    getWhitelist : function() {
        return this.get("whitelist")
    },

    getBlacklist : function() {
        return this.get("blacklist")
    },

    getUsername : function() {
        return this.get("username")
    },

    getResourceURI : function() {
        return this.get("resourceURI")
    },

    isLoggedIn : function() {
        if (this.getUsername() === this.defaults.username || this.getResourceURI() === this.defaults.resourceURI) {
            this.logout();
        }
        return this.get("loggedIn")
    },

    //when the user is logged in set the boolean to give logged in views.
    setLogin : function(status) {
        this.set({ 
            "loggedIn": status,
        });

        var map = {
            "true" : "login",
            "false" : "logout"
        };

        loginBadge(map[status]);
    },

    login : function() {
        this.setLogin(true);
    },

    logout : function() {
        this.setLogin(false);
    },
    
    setUsername : function(username) {
        this.set({ 
            "username": username,
        });
        this.setResourceURI(username);
    },

    setResourceURI : function(username) {
        this.set({
            "resourceURI" : sprintf("/api/v1/user/%s/", username)
        })
    },

    setWhitelist : function(whitelist) {
        this.setFilterSet("whitelist", whitelist);
    },

    setBlacklist : function(blacklist) {
        this.setFilterSet("blacklist", blacklist);
    },

    setFilterSet : function(type, list) {
        this.set({
            type : list
        })
    },

    //check if a url is in the blacklist
    inBlackList : function(url) {
        return this.inSet("blacklist", url)
    },

    //check if a url is in the whitelise
    inWhitelist : function(url) {
        return this.inSet("whitelist", url)
    },

    //check if url is in a set (either whitelist or blacklist)
    // documentation for URL.js : http://medialize.github.com/URI.js/docs.html
    inSet : function(setType, url) {
        var set = this.get(setType);
        var uri = new URI(url)
        var hostname = uri.hostname();
        var protocol = uri.protocol();
        return (set.where({"url" : hostname}).length || set.where({"url" : protocol}).length || set.where(url).length)
    },

    //save the current state to local storage
    saveState : function(){
        localStorage.user = JSON.stringify(this);
    },
});
