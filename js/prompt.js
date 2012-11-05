var popups = [];
var mousein = false;
function setup() {
	var w = document.width;
	var size = 300;
	var height = 500;
	var settings = {'z-index': 999999999,
					'width': size,
					'height': height,
					'position': 'fixed',
					'left': w-size,
					'top': 0};
	var tray = $(document.createElement("div")).css(settings).attr('id', 'tray');

	$(document.body).append(tray);
}

function popup(t) {
	var h = popups.length;
	var tray = $('#tray');
	var imgUrl = chrome.extension.getURL("/img/bg-nav.png"); 
	console.log("URL: " + imgUrl);
	var settings = {'border': 'solid 3px white',
			'border-radius': 20,
			'background-image': 'url("' + imgUrl + '")',
			'opacity': .7,
			'width': 200,
			'height': 100,
			'top': h*120,
			'position': 'absolute',
			'left': 50};
	var newDiv = $(document.createElement("div")).css(settings);

	var innerSet = {'color': 'black',
					'top': 25,
					'display': 'block',
					'position': 'absolute',
					'text-align': 'center'
					};

	var innerDiv = $(document.createElement("div")).css(innerSet).text("Can we track activity from \n" + t + "?");
	var table = $(document.createElement('table')).css({'margin-left': 'auto',
					'margin-right': 'auto'});
	var tr = $(document.createElement('tr'));
	var td1 = $(document.createElement('td'));
	var td2 = $(document.createElement('td'));
	function passMessage(action,url,el){
		return function(){
			if (el != undefined) {
				console.log("HERE");
				$(el).remove();
			}
			var message = {"action": action,
							"url": url};
			chrome.extension.sendMessage(JSON.stringify(message));
		}
	}
	$(td1).append(addButton("Allow").click(passMessage('whitelist', t, newDiv)));
	$(td2).append(addButton("No").click(passMessage('blacklist', t, newDiv)));
	$(tr).append(td1);
	$(tr).append(td2);
	$(table).append(tr);
	$(innerDiv).append(table);
	$(newDiv).append(innerDiv);
	$(tray).append(newDiv);
	var t = setTimeout(function() {fade(newDiv)}, 2000);
	$(newDiv).hover(function() {
		console.log("CLEARED");
		mousein = true;
		clearInterval(t);
		$(newDiv).stop();
		$(newDiv).css('opacity', 1.0);
		//$(newDiv).css('border', 'solid 2px white');
	})
	$(newDiv).mouseleave(function() {
		mousein = false;
		t = setTimeout(function() {fade(newDiv)}, 2000);
	})
	popups.push(newDiv);
}

function addButton(t) {
	var b = $(document.createElement('input')).attr({'type':'button','value': t});
	$(b).click(function() {

	});
	return b
}

function fade(el) {
	$(el).fadeOut(1000,function() {
		$(popups.shift()).remove();
		for (var i = 0; i < popups.length; i++) {
			h = parseInt($(popups[i]).css('top'))-120;
			$(popups[i]).animate({'top': h},500);
		};
	});
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
	var action = request['action'];
	if (action == 'prompt') {
		setup();
		var uri = new URI(document.location)
		var hostname = uri.hostname();
		console.log(hostname);
		popup(hostname);
	}
})