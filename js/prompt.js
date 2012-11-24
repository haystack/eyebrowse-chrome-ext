var popups = [];
var mousein = false;
function setup() {
	if ($('#tray').length > 0) {
		$('#tray').css('z-index',999999999);
		return;
	}
	var w = document.width;
	var size = 300;
	var height = 200;
	var settings = {'z-index': 999999999,
					'border-style': 'none',
					'width': size,
					'height': height,
					'position': 'fixed',
					'left': w-size,
					'top': 0};
	var tray = $(document.createElement("iframe")).css(settings).attr('id', 'tray');

	$(document.body).append(tray);
}

function popup(t, callback) {
	var h = popups.length;
	var frame = $('#tray').contents();
	var tray = frame.find('body');
	var imgUrl = 'url("' + chrome.extension.getURL("/img/bg-nav.png") + '")'; 
	$.get(chrome.extension.getURL("/js_templates/prompt.html"),function(template){
		data = {"site": t,
				"imgUrl": imgUrl}
		$(tray).html(Mustache.to_html(template, data));

		var el = frame.find('#popup');
		frame.find('#allowBt').click(passMessage('whitelist', t, el));
		frame.find('#noBt').click(passMessage('blacklist', t, el));
		var to = setTimeout(function() {fade(el)}, 2000);
		el.hover(function() {
			
			mousein = true;
			clearInterval(to);
			el.stop();
			el.css('opacity', 1.0);
			//$(newDiv).css('border', 'solid 2px white');
		})
		el.mouseleave(function() {
			mousein = false;
			to = setTimeout(function() {fade(el)}, 2000);
		})
		popups.push(el);
	});
}

function passMessage(action, url, el){
	//callback(action)
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
	el.fadeOut(1000,function() {
		popups.shift().remove();
		for (var i = 0; i < popups.length; i++) {
			h = parseInt(popups[i].css('top'))-120;
			popups[i].animate({'top': h},500);
		};
		$('#tray').css('z-index',-1)
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