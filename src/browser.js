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

// Makes badge indicate that an action is pending.
export function displayLoading() {
  updateBadge(messages.LOADING_BADGE_DATA);
};

// Updates the specified properties of the badge.
export function updateBadge(data) {
  if ('icon' in data)
    chrome.browserAction.setIcon({ path: data.icon });
  if ('text' in data)
    chrome.browserAction.setBadgeText({ text: data.text });
  if ('title' in data)
    chrome.browserAction.setTitle({ title: data.title });
  if ('color' in data)
    chrome.browserAction.setBadgeBackgroundColor({ color: data.color });
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
export function FetchError(message, is_login_error) {
  Error.call(this, message);
  this.message = message;
  this.is_login_error = is_login_error;
}
FetchError.prototype = Object.create(Error.prototype);
FetchError.prototype.constructor = FetchError;

// Returns a promise that will resolve to the content of the given path.
export function fetchUrl(path, params, headers) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    if (params) {
      var separator = '?';
      params.forEach(function(param) {
        var key = encodeURIComponent(String(param[0]));
        var val = encodeURIComponent(String(param[1]));
        path += separator + key + '=' + val;
        separator = '&';
      });
    }
    xhr.open('GET', path, true);
    if (headers) {
      utils.Map.wrap(headers).forEach(function(key, value) {
        xhr.setRequestHeader(key, value);
      });
    }
    xhr.onreadystatechange = function() {
      if (xhr.readyState != 4)
        return;

      if (xhr.status == 200) {
        resolve(xhr.responseText);
      } else if (xhr.statusText == 'OK') {
        // The error message is in the response body. Those are likely
        // auth-related issues, so add login prompt.
        reject(new FetchError(xhr.responseText + config.LOGIN_PROMPT,
          true));
      } else if (xhr.status >= 400 && xhr.status <= 403) {
        // Authentication error, offer login.
        reject(
          new FetchError("HTTP " + xhr.status + config.LOGIN_PROMPT,
            true));
      } else if (xhr.statusText == '' && xhr.status == 0) {
        // No error text and a status of 0 usually indicate a missing
        // cookie (e.g., a redirect to a sign-in service, which fails
        // the request due to Chrome's CORS restrictions). Add login prompt.
        reject(new FetchError('Unknown error.' + config.LOGIN_PROMPT,
          true));
      } else {
        reject(new FetchError(xhr.statusText, false));
      }
    };
    xhr.send(null);
  });
};

// Sends a browser message, returning a promise for the result.
export function sendExtensionMessage(args, callback) {
  chrome.runtime.sendMessage(args, callback);
};

// Adds a callback to be notifier of extension message.
export function addExtensionMessageListener(callback) {
  chrome.runtime.onMessage.addListener(callback);
}

// Schedules a thunk to be called when all content is loaded.
export function callWhenLoaded(thunk) {
  window.addEventListener('DOMContentLoaded', thunk);
};

// Open a new tab displaying the given url, or activate the first
// tab displaying the given url if one exists.
export function openUrl(url) {
  chrome.windows.getLastFocused({ populate: true }, function(currentWindow) {
    var candidates = currentWindow.tabs.filter(function(tab) {
      return tab.url == url;
    });

    if (candidates.length == 0) {
      chrome.tabs.create({ url: url });
    } else {
      var active = candidates.filter(function(tab) {
        return tab.active;
      });

      if (active.length != 0) {
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
  return new Promise(function(resolve, reject) {
    chrome.storage.sync.get(config.DEFAULT_OPTIONS, function(options) {
      resolve(options);
    });
  });
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

// Fetches origins allowed for the extension.
export function getAllowedOrigins() {
  return new Promise(function(resolve, reject) {
    chrome.permissions.getAll(function(permissions) {
      resolve(permissions.origins);
    });
  });
};

// Requests permissions to allow access to those origins.
export function setAllowedOrigins(origins) {
  return getAllowedOrigins()
    .then(function(allowed_origins) {
      var remove_permissions = { origins: [] };
      allowed_origins.forEach(function(origin) {
        if (!origins.includes(origin)) {
          remove_permissions.origins.push(origin);
        }
      });
      var request_permissions = { origins: [] };
      origins.forEach(function(origin) {
        if (!allowed_origins.includes(origin)) {
          request_permissions.origins.push(origin);
        }
      });
      return new Promise(function(resolve, reject) {
        chrome.permissions.remove(remove_permissions, function(removed) {
          if (!removed) {
            reject(new Error("cannot drop permissions"));
            return;
          }

          chrome.permissions.request(request_permissions, function(granted) {
            if (!granted) {
              reject(new Error("permissions not granted"));
              return;
            }

            resolve();
          });
        });
      });
    });
};

// Opens the option page.
export function openOptionsPage() {
  chrome.runtime.openOptionsPage();
};
