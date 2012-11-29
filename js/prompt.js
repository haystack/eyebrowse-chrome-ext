var popups = [];
var mousein = false;
function setup() {
	if ($('#tray').length > 0) {
		$('#tray').css('z-index',999999999);
		return;
	}
	var size = 300;
	var height = 200;
	var settings = {
		'z-index': 999999999,
		'border-style': 'none',
		'width': size,
		'height': height,
		'position': 'fixed',
		'right': '0px',
		'top': '0px',
	};
	var tray = $("<iframe>").css(settings).attr('id', 'tray');

	$(document.body).append(tray);
}

function popup(site, callback) {
	var frame = $('#tray').contents();
	var body = frame.find('body');
	var backgroundUrl = chrome.extension.getURL("/img/bg-body.png"); 
	$.get(chrome.extension.getURL("/js_templates/prompt.html"),function(templateURL){
			data = {
				"site": site,
				"backgroundUrl": backgroundUrl
			};
			$(body).html(Mustache.to_html(templateURL, data));

			var el = frame.find('#popup');
			frame.find('#allow-btn').click(passMessage('whitelist', site, el));
			frame.find('#deny-btn').click(passMessage('blacklist', site, el));
			//var to = setTimeout(function() {fade(el)}, 2000);
			el.hover(function() {
				
				mousein = true;
				clearInterval(to);
				el.stop();
				//el.css('opacity', 1.0);
				$(el).fadeIn()
			})
			el.mouseleave(function() {
				mousein = false;
				to = setTimeout(function() {fade(el)}, 2000);
			})
			popups.push(el);
		});
}

function passMessage(action, url, el){
	return function(){
		if (el != undefined) {
			el.remove();
			popups.shift();
		}
		var message = {
			"action" : 'filterlist',
			"type": action,
			"url": url
		};
		chrome.extension.sendMessage(JSON.stringify(message));
	}
}

function fade(el) {
	el.fadeOut(1000, function() {
		popups.shift().remove();
		for (var i = 0; i < popups.length; i++) {
			h = parseInt(popups[i].css('top')) -120;
			popups[i].animate({'top': h}, 500);
		};
		$('#tray').css('z-index', -1)
	});
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	var action = request['action'];
	if (action == 'prompt') {
		setup();
		var uri = new URI(document.location)
		var hostname = uri.hostname();
		popup(hostname, function(res) {
			sendResponse({
				'promptRes' : res,
			})
		})
	}
})