// Copyright (c) 2014 by atlantis9. All rights reserved.
//
// Use of the Chrome extension source is governed by a BSD-style License
// that can be found in the LICENSE file.

function SwitchToTab(windowId, tabId) {
	chrome.windows.get(windowId, {}, function(window) {
		if (window == undefined) return;
		chrome.windows.update(windowId, {focused: true}, function(window) {
			chrome.tabs.get(tabId, function(tab) {
				if (tab == undefined) return;
				chrome.tabs.update(tabId, {active: true});
			});
		});
	});
}

function EnqueueActiveWindowAndTab(windowId, tabId) {
	chrome.storage.local.get("last-tabs", function(lastTabs) {
		var tabs = lastTabs["last-tabs"];
		if (tabs == undefined) tabs = [];

		// No-op if the active window and tab didn't change.
		if (tabs.length > 0 && tabs[0].windowId == windowId && tabs[0].tabId == tabId) return;

		var numTabs = tabs.unshift({"windowId": windowId, "tabId": tabId});
		if (numTabs > 2) tabs.length = 2;	// Keep at most two tabs

		chrome.storage.local.set({"last-tabs": tabs});
	});
}

// Tab's onActivated
chrome.tabs.onActivated.addListener(function(activeInfo) {
	// console.log("onActivated: " + activeInfo.windowId + "." + activeInfo.tabId);
	EnqueueActiveWindowAndTab(activeInfo.windowId, activeInfo.tabId);
});

// Window's onFocusChanged
chrome.windows.onFocusChanged.addListener(function(windowId) {
	// Note that switching back to a window's previously active tab will NOT trigger the
	// onActivated event. This is handled by also enqueuing the current active window and tab
	// when focus is changed.
	//
	// Now, when switching to a new active tab in an out-of-focus window, both onActivated and
	// onFocusChanged would be triggered. EnqeueeActiveWindowAndTab() will correctly handle this
	// case by executing a no-op on duplication. In rare cases, onFocusChanged could be triggered
	// before the new active tab is set, which would result in wrong behavior. The current version
	// does not handle this case properly, but the impact is negligible.
	chrome.windows.get(windowId, {populate: true}, function(window) {
		if (window.type != undefined && window.type == "normal") {
			var numTabs = window.tabs.length;
			for (var i = 0; i < numTabs; i++) {
				if (window.tabs[i].active) {
					// console.log("OnFocusChanged: " + windowId + "." + window.tabs[i].id);
					EnqueueActiveWindowAndTab(windowId, window.tabs[i].id);
					return;
				}
			}
		}
	});
});

// Hotkey trigger
chrome.commands.onCommand.addListener(function(command) {
	if (command == "switch-to-last-tab") {
		chrome.storage.local.get("last-tabs", function(lastTabs) {
			var tabs = lastTabs["last-tabs"];
			if (tabs != undefined && tabs.length == 2) {
				SwitchToTab(tabs[1].windowId, tabs[1].tabId);
			}
		});
	}
});