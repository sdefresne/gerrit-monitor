// Copyright 2020 Google LLC
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
import * as messages from './messages.js';

// Keys used for local storage to avoid duplicate notifications.
const CL_LAST_NOTIFICATION_KEY = 'cl_last_notified';  // Per-CL state.
const ACTIVE_ERRORS_KEY = 'active_errors';  // Active error conditions.

// Return true if notifications are enabled.
export async function notificationsEnabled() {
  let [options, grantedPermissions] = await Promise.all([
      browser.loadOptions(),
      browser.getGrantedPermissions(),
  ]);

  return options.showNotifications !== config.OPTION_DISABLED &&
         grantedPermissions.permissions.includes('notifications');
}

// Returns true if we should notify for errors.
export async function notifyForErrors() {
  const options = await browser.loadOptions();
  return options.notifyForErrors != config.OPTION_DISABLED;
}

// Send notifications.
export async function notify(results, errors) {
  if (await notificationsEnabled()) {
    if (await notifyForErrors()) {
      await notifyErrors(errors);
    }
    await notifyCLs(results);
  }
};

// Notify about any errors.
//
// We only notify about the first error per host until we see that host has had
// a successful result again.
async function notifyErrors(errorList) {
  // Fetch known-bad hosts.
  const badHosts = await browser.getLocalStorage(ACTIVE_ERRORS_KEY, []);
  const badHostsSet = new Set(badHosts);

  // Show a notification for every host not already in the known-bad list.
  let newErrors = [];
  for (const error of errorList) {
    if (!badHostsSet.has(error.host)) {
      newErrors.push(error)
    }
  }

  if (newErrors.length) {
    const firstError = newErrors[0];
    if (newErrors.length === 1) {
      notifyError(
          firstError.host,
          "Could not load results from " + firstError.host +
              ": " + firstError.error);
    } else {
      notifyError(
          firstError.host,
          "Could not load results from " + newErrors.length + " hosts.");
    }
  }

  // Update the new list.
  return browser.setLocalStorage(
      ACTIVE_ERRORS_KEY,
      errorList.map(error => error.host));
}

// Send notifications about CLs on the given list.
//
// We only send a notification if the state of the CL has changed since we last
// notified about it.
async function notifyCLs(clList) {
  // Load details about CLs we've already notified the user about.
  let lastNotifications = new Map(await browser.getLocalStorage(CL_LAST_NOTIFICATION_KEY, new Array()));
  let newNotificationState = new Map();

  // Enumerate different categories of CLs.
  var categories = clList.getCategoryMap();
  for (const category of messages.SECTION_ORDERING) {
    // If we don't have any CLs in this category, continue.
    if (!categories.has(category)) {
      continue;
    }

    // Get metadata about this category.
    var category_data = messages.BADGE_DATA[category];
    if (category_data === null) {
      continue;
    }

    // If we don't need to notify about this category, continue.
    if (!category_data.shouldNotify) {
      continue;
    }

    // Iterate through CLs in this category.
    for (const cl of categories.get(category)) {
      newNotificationState.set(cl.getChangeId(), category);

      // If we've already notified about this CL, skip it.
      if (lastNotifications.get(cl.getChangeId()) === category) {
        continue;
      }

      // Otherwise, send out a notification.
      notifyCL(category_data, cl);
    }
  }

  // Save notification state.
  await browser.setLocalStorage(CL_LAST_NOTIFICATION_KEY, Array.from(newNotificationState));
}

// Send an error notification.
function notifyError(url, message) {
  var options = {
      type: "basic",
      title: "Error fetching CL status",
      iconUrl: 'img/ic_assignment_late_black_24dp_2x.png',
      message: message,
      requireInteraction: true,
  };
  browser.createNotification(url, options);
};

// Send a CL notification.
function notifyCL(category, cl) {
  var options = {
    type: "basic",
    title: category.notificationTitle,
    iconUrl: category.icon['48'],
    message: cl.getSubject(),
    requireInteraction: true,
  };
  browser.createNotification(cl.getGerritUrl(), options);
};
