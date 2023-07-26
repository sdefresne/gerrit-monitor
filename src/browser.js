// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as config from './config.js';
import * as messages from './messages.js';
import * as utils from './utils.js';

const isDOM = typeof window !== 'undefined'

// Returns whether a permission change object is empty.
function permissionChangeEmpty(permissions_change) {
  return permissions_change.origins.length === 0 &&
         permissions_change.permissions.length === 0;
}

// Makes badge indicate that an action is pending.
export function displayLoading() {
  updateBadge(messages.LOADING_BADGE_DATA);
};

// Updates the specified properties of the badge.
export function updateBadge(data) {
  if ('icon' in data)
    chrome.action.setIcon({ path: data.icon });
  if ('text' in data)
    chrome.action.setBadgeText({ text: data.text });
  if ('title' in data)
    chrome.action.setTitle({ title: data.title });
  if ('color' in data)
    chrome.action.setBadgeBackgroundColor({ color: data.color });
};

// Returns the DOM element with the given id.
export function getElement(id) {
  return document.getElementById(id);
};

// Creates and return a DOM element with the given tag.
export function createElement(tag) {
  return document.createElement(tag);
};

// Creates and return a text element with the given value.
export function createTextNode(value) {
  return document.createTextNode(value);
};

// FetchError represents errors while attempting to fetch a URL.
export class FetchError {
  constructor(message, is_login_error) {
    this.message = message;
    this.is_login_error = is_login_error;
  }

  static wrap(json) {
    return new FetchError(json.message, json.is_login_error);
  }
}

// Returns a promise that will resolve to the content of the given path.
export function fetchUrl(path, params, headers = {}) {
  return new Promise(async function(resolve, reject) {
    try {
      if (params) {
        var separator = '?';
        params.forEach(function(param) {
          var key = encodeURIComponent(String(param[0]));
          var val = encodeURIComponent(String(param[1]));
          path += separator + key + '=' + val;
          separator = '&';
        });
      }

      const response = await fetch(path, {headers});
      const statusCode = response.status;
      const responseText = await response.text();

      if (response.status == 200) {
        resolve(responseText);
      } else if (response.statusText == 'OK') {
        // The error message is in the response body. Those are likely
        // auth-related issues, so add login prompt.

        reject(new FetchError(`${responseText}${config.LOGIN_PROMPT}`,
          true));
      } else if (statusCode >= 400 && statusCode <= 403) {
        // Authentication error, offer login.
        reject(
          new FetchError(`HTTP ${statusCode}${config.LOGIN_PROMPT}`,
            true));
      } else if (response.statusText == '' && statusCode == 0) {
        // No error text and a status of 0 usually indicate a missing
        // cookie (e.g., a redirect to a sign-in service, which fails
        // the request due to Chrome's CORS restrictions). Add login prompt.
        reject(new FetchError(`Unknown error. ${config.LOGIN_PROMPT}`,
          true));
      } else {
        reject(new FetchError(`HTTP ${statusCode}`, false));
      }
    } catch (error) {
      reject(new FetchError(`Unknown error. ${e.message}`, false));
    };
  });
};

// Sends a browser message, returning a promise for the result.
export function sendExtensionMessage(args, callback) {
  chrome.runtime.sendMessage(args, callback);
};

// Adds a callback to be notifier of extension message.
export async function addExtensionMessageListener(callback) {
  chrome.runtime.onMessage.addListener(callback);
}

// Schedules a thunk to be called when all content is loaded.
export async function callWhenLoaded(thunk) {
  if (isDOM) {
    // we are in a DOM based environment
    window.addEventListener('DOMContentLoaded', thunk);
  } else {
    // we are in something extension specific
    chrome.runtime.onInstalled.addListener(thunk)
  }
};

globalThis.chrome.runtime.onInstalled.addListener

// Open a new tab displaying the given url, or activate the first
// tab displaying the given url if one exists.
export function openUrl(urlString, reuse_if_possible) {
  chrome.windows.getLastFocused({ populate: true }, function(currentWindow) {
    var candidates = currentWindow.tabs.filter(function(tab) {
      return tab.url == urlString && reuse_if_possible == true;
    });

    if (candidates.length == 0) {
      const url = new URL(urlString);
      // Setting the User Source Parameter (usp) such that Gerrit understands
      // that the user is coming from Gerrit Monitor.
      url.searchParams.set('usp', 'gerrit-monitor');
      chrome.tabs.create({ url: url.toString() });
    } else {
      var active = candidates.filter(function(tab) {
        return tab.active;
      });

      if (active.length != 0 && isDOM) {
        // If the active tab already present the given url, just close
        // the popup (as the activation will not close it automatically).
        window.close();
      } else {
        chrome.tabs.update(candidates[0].id, { active: true }, function(tab) {
          // nothing to do.
        });
      }
    }
  });
};

// Loads options from storage and return a promise with the options.
export function loadOptions() {
  var promise = new Promise(function(resolve, reject) {
    chrome.storage.sync.get(config.DEFAULT_OPTIONS, function(options) {
      resolve(options);
    });
  });
  return promise.catch(() => {});
};

// Saves options to storage, returning a promise that will be resolved
// when the options are saved.
export function saveOptions(options) {
  options = utils.Map.wrap(options);
  return new Promise(function(resolve, reject) {
    var options_with_defaults = {};
    utils.Map.wrap(config.DEFAULT_OPTIONS).forEach(function(key, value) {
      if (options.has(key)) {
        options_with_defaults[key] = options.get(key);
      } else {
        options_with_defaults[key] = value;
      }
    });
    chrome.storage.sync.set(options_with_defaults, function() {
      resolve(options_with_defaults);
    });
  });
};

// Load values from local (non-synchronised) storage.
export function getLocalStorage(key, defaultVal) {
  return new Promise(function(resolve) {
    chrome.storage.local.get([key], (result) => {
      if (result[key] === undefined) {
        resolve(defaultVal);
      } else {
        resolve(result[key]);
      }
    });
  });
}

// Save the given value to local storage.
export async function setLocalStorage(key, val) {
  let result = {};
  result[key] = val;
  return new Promise(function (resolve) {
    chrome.storage.local.set(result, function() {
      resolve();
    });
  });
}

// Fetch all permissions granted to the extension.
export function getGrantedPermissions() {
  return new Promise(function(resolve, reject) {
    chrome.permissions.getAll(function(permissions) {
      resolve(permissions);
    });
  });
}

// Requests permissions needed for the extension.
export async function requestPermissions(origins, notifications) {
  var permissions = await getGrantedPermissions();
  var notifications_granted = permissions.permissions.includes('notifications');

  var permissions_removal = {origins: [], permissions: []};
  if (permissions.origins) {
    permissions_removal.origins = permissions.origins
        .filter(origin => { return !origins.includes(origin); });
  }
  if (!notifications && notifications_granted) {
    permissions_removal.permissions.push('notifications');
  }

  if (!permissionChangeEmpty(permissions_removal)) {
    await new Promise(function(resolve, reject) {
      chrome.permissions.remove(permissions_removal, function(removed) {
        if (!removed) {
          reject(new Error("cannot drop permissions"));
          return;
        }

        resolve();
      })
    });
  }

  var permissions_request = {origins: origins, permissions: []};
  if (permissions.origins) {
    permissions_request.origins = origins
        .filter(origin => { return !permissions.origins.includes(origin); });
  }

  if (notifications && !notifications_granted) {
    permissions_request.permissions.push('notifications');
  }

  if (!permissionChangeEmpty(permissions_request)) {
    await new Promise(function(resolve, reject) {
      chrome.permissions.request(permissions_request, function(granted) {
        if (!granted) {
          reject(new Error("permissions not granted"));
          return;
        }

        resolve();
      });
    });
  }
}

// Opens the option page.
export function openOptionsPage() {
  chrome.runtime.openOptionsPage();
};

// Create a notification.
//
// The "url" parameter is used as the notification ID, and will be navigated to when
// the notification is clicked on.
export function createNotification(url, options) {
  // Register for notifications if we haven't already.
  //
  // We need to do this lazily, because "chrome.notifications" won't exist if we
  // don't have notification permissions.
  if (!chrome.notifications.onClicked.hasListener(notificationClicked)) {
    chrome.notifications.onClicked.addListener(notificationClicked);
  }

  chrome.notifications.create(url, options);
}

// Handle a click to a notification.
//
// When a notification is clicked, open a URL and clear the notification.
function notificationClicked(url) {
  openUrl(url, true);
  chrome.notifications.clear(url);
}
