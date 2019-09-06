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

import * as browser from './browser.js';
import * as config from './config.js';
import * as gerrit from './gerrit.js';
import * as messages from './messages.js';

// Fetches information about interesting CLs and update the badge.
function fetchAndUpdate(hosts, detailed) {
  return fetchCls(hosts, detailed)
    .then(function(promises) {
      let fullfilled = promises
        .filter(function(promise) {
          return promise.status === "fulfilled";
        })
        .map(function(promise) {
          return promise.value;
        });

      let rejected = promises
        .filter(function(promise) {
          return promise.status !== "fulfilled";
        })
        .map(function(promise) {
          return {
            host: promise.reason.host,
            error: promise.reason.error.message,
          }
        });

      return update({
        results: new gerrit.SearchResults(fullfilled),
        errors: rejected,
      });
    });
};

// Fetches information about interesting CLs.
function fetchCls(hosts, detailed) {
  if (hosts.length === 0) {
    return Promise.reject(new Error(config.NO_HOST_ALLOWED));
  }

  return Promise.allSettled(hosts.map(function(host) {
    return gerrit.fetchAccount(host)
        .then(function(account) {
          return gerrit.fetchReviews(host, account, detailed);
        })
        .catch(function(error) {
          return Promise.reject({
            host: host,
            error: error,
          });
        });
  }));
};

// Updates the badge.
function update(wrapper) {
  // Re-schedule the function to be called later, cancelling any pending
  // alarm (as this is called when the user open the popup menu).
  chrome.alarms.clear('auto-refresh');
  chrome.alarms.create('auto-refresh', {
    delayInMinutes: config.REFRESH_DELAY_IN_MINUTES,
  });

  var updateData = null;
  if (wrapper.errors.length !== 0) {
    updateData = {
      text: '!',
      color: 'red',
      title: 'Error: ' + wrapper.errors[0].error,
      icon: {
        '24': 'img/ic_assignment_late_black_24dp_1x.png',
        '48': 'img/ic_assignment_late_black_24dp_2x.png',
      },
    };
  } else {
    var categories = wrapper.results.getCategoryMap();
    messages.SECTION_ORDERING.forEach(function(attention) {
      if (updateData != null)
        return;

      if (!categories.has(attention))
        return;

      var data = messages.BADGE_DATA[attention];
      if (data === null)
        return;

      var count = categories.get(attention).length;
      updateData = {
        text: String(count),
        icon: data.icon,
        title: data.formatTitle(count),
        color: data.color,
      };
    });
  }

  if (updateData === null)
    updateData = messages.DEFAULT_BADGE_DATA;

  browser.updateBadge(updateData);
  return Promise.resolve(wrapper);
};

// Automatically refresh the badge.
function onAlarm() {
  gerrit.fetchAllowedInstances()
    .then(function(instances) {
      return fetchAndUpdate(
          instances.map(function(instance) { return instance.host; }),
          false);
    })
    .catch(function(error) { /* do nothing */ });
};

// Creates a message listener that turns browser channel message into
// calls on the given object. All methods must return a promise and
// the result of the promise will be returned to the sender.
function newMessageProxy(handler) {
  return function(request, sender, reply) {
    var hasResponded = false;
    (handler[request[0]]).apply(handler, request.slice(1))
        .then(function(value) {
          reply({value: JSON.parse(JSON.stringify(value))});
          hasResponded = true;
        }, function(error) {
          reply({error: String(error)});
          hasResponded = true;
        });
    // If the promise is not yet fullfilled, return true to indicate that
    // the reply will be asynchronous.
    return !hasResponded;
  };
};

// Handler object for responding to requests from the popup.
class RequestProxy {
  constructor() {}

  // Returns the search results displayed in the popup. If no search
  // results are saved, then cause the badge to refresh.
  getSearchResults(hosts) {
    return fetchAndUpdate(hosts, true);
  }
}

browser.callWhenLoaded(function() {
  browser.addExtensionMessageListener(
      newMessageProxy(new RequestProxy()));

  chrome.alarms.onAlarm.addListener(onAlarm);
  onAlarm();
});
