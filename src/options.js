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
import * as dombuilder from './dombuilder.js';
import * as gerrit from './gerrit.js';

// Option object.
export class Options {
  constructor() {
    this.instances_ = [];
    this.onlyAttentionSet_ = config.OPTION_UNSPECIFIED;
    this.showNotifications_ = config.OPTION_UNSPECIFIED;
    this.notifyForErrors_ = config.OPTION_UNSPECIFIED;
  }

  // Return the value for option.
  instances() {
    return this.instances_;
  }

  // Return true if notifications are enabled.
  notificationsEnabled() {
    return this.showNotifications_ !== config.OPTION_DISABLED;
  }

  // Return true if we should notify on error.
  notifyOnErrorsEnabled() {
    return this.notifyForErrors_ !== config.OPTION_DISABLED;
  }

  // Sets the status text (with a timeout).
  setStatusText(text, opt_timeout) {
    browser.getElement('status').innerText = text;
    setTimeout(
        function() { browser.getElement('status').innerText = ''; },
        opt_timeout || 2000);
  }

  // Add a new Gerrit instance, or enable the instance if it already exists.
  addGerritInstance(host, name, enabled) {
    for (var i = 0; i < this.instances_.length; i++) {
      var instance = this.instances_[i];
      if (instance.host === host) {
        instance.enabled = true;
        instance.name = name;
        browser.getElement('instance-' + i).checked = 'true';
        return;
      }
    }

    var instance = { host: host, name: name, enabled: enabled, deleted: false };
    var instance_index = this.instances_.length;
    this.instances_.push(instance);

    // Calling setAttribute('for', checkbox_id) does not work during the
    // construction, so wait until the element have been created to set it.
    var labels = [];
    var inputs = [];
    dombuilder.DomBuilder.attach(browser.getElement('instances'))
      .begin('tr')
        .begin('td')
          .begin('label')
            .appendText(name)
            .withCurrentNode(function(node) { labels.push(node); })
          .end('label')
        .end('td')
        .begin('td')
          .begin('label')
            .appendText(host)
            .withCurrentNode(function(node) { labels.push(node); })
          .end('label')
        .end('td')
        .begin('td')
          .addClass('center-aligned')
          .begin('input')
            .setAttribute('type', 'checkbox')
            .setAttribute('id', 'instance-' + instance_index)
            .setAttribute('checked', enabled)
            .withCurrentNode(function(node) {
              inputs.push(node);
              node.addEventListener('change', function() {
                instance.enabled = node.checked;
              });
            })
          .end('input')
        .end('td')
        .begin('td')
          .addClass('center-aligned')
          .begin('input')
            .setAttribute('type', 'checkbox')
            .setAttribute('checked', false)
            .withCurrentNode(function(node) {
              node.addEventListener('change', function() {
                instance.deleted = node.checked;
                if (node.checked) {
                  inputs.forEach(function(node) {
                    node.disabled = true;
                  });
                  labels.forEach(function(node) {
                    dombuilder.DomBuilder.attach(node).addClass('disabled');
                  });
                } else {
                  inputs.forEach(function(node) {
                    node.disabled = false;
                  });
                  labels.forEach(function(node) {
                    dombuilder.DomBuilder.attach(node).removeClass('disabled');
                  })
                }
              });
            })
          .end('input')
        .end('td')
      .end('tr');

    labels.forEach(function(node) {
      node.setAttribute('for', 'instance-' + instance_index);
    });
  }

  // Restore the options from Chrome storage and update the option page.
  async loadOptions() {
    let options = await browser.loadOptions();
    let instances = await gerrit.fetchAllInstances(options);

    // Update the list of Gerrit instances.
    for (const instance of instances) {
      this.addGerritInstance(instance.host, instance.name, instance.enabled);
    }

    // Update the attention set option.
    if (options.onlyAttentionSet !== undefined) {
      this.onlyAttentionSet_ = options.onlyAttentionSet;
      browser.getElement('only-attention-set').value = options.onlyAttentionSet;
    } else {
      this.onlyAttentionSet_ = config.OPTION_UNSPECIFIED;
    }

    // Update the notification option.
    if (options.showNotifications !== undefined) {
      this.showNotifications_ = options.showNotifications;
      browser.getElement('show-notifications').value = options.showNotifications;
    } else {
      this.showNotifications_ = config.OPTION_UNSPECIFIED;
    }

    // Update the notify on error option.
    if (options.notifyForErrors !== undefined) {
      this.notifyForErrors_ = options.notifyForErrors;
      browser.getElement('notify-for-errors').value = options.notifyForErrors;
    } else {
      this.notifyForErrors_ = config.OPTION_UNSPECIFIED;
    }
  }

  // Save the options to Chrome storage and update permissions.
  async saveOptions() {
    var instances = this.instances_
        .filter(function(instance) { return !instance.deleted; })
        .map(function(instance) {
          return {
            host: instance.host,
            name: instance.name,
            enabled: instance.enabled,
          }
        });

    var options = {
      instances: instances,
      onlyAttentionSet: this.onlyAttentionSet_,
      showNotifications: this.showNotifications_,
      notifyForErrors: this.notifyForErrors_,
    };

    // Determine the set of origins we need access to.
    var origins = [];
    instances.forEach(function(instance) {
      if (instance.enabled) {
        var match = config.ORIGIN_REGEXP.exec(instance.host);
        if (match !== null) {
          origins.push(match[1] + "/*");
        }
      }
    });

    try {
      var notifications = this.showNotifications_ !== config.OPTION_DISABLED;
      await browser.requestPermissions(origins, notifications);
      await browser.saveOptions(options);
      this.setStatusText('Options saved.');
    } catch (error) {
      this.setStatusText(String(error));
    }

    if (instances.length !== this.instances_.length) {
      this.instances_ = [];
      var parent = browser.getElement('instances');
      while (parent.children.length !== 0) {
        parent.removeChild(parent.children[0]);
      }
      for (var instance of instances) {
        this.addGerritInstance(instance.host, instance.name, instance.enabled);
      }
    }
  }

  // Main method.
  onLoaded() {
    this.loadOptions();

    browser.getElement('add-button-name').pattern = '.+';
    browser.getElement('add-button-host').pattern = config.ORIGIN_PATTERN;
    browser.getElement('add-button').addEventListener('click', (function () {
      var host = browser.getElement('add-button-host').value;
      var name = browser.getElement('add-button-name').value;

      var match = config.ORIGIN_REGEXP.exec(host);
      var host_is_valid = match !== null && match[0].length == host.length;
      if (host_is_valid && name.length !== 0) {
        this.addGerritInstance(host, name, true);
        browser.getElement('add-button-host').value = '';
        browser.getElement('add-button-name').value = '';
      } else {
        this.setStatusText('Incorrect values.');
      }
    }).bind(this));

    // Set up "only-attention-set" option.
    browser.getElement('only-attention-set').addEventListener('change', (function () {
      this.onlyAttentionSet_ = browser.getElement('only-attention-set').value;
    }).bind(this));

    // Set up "show-notifications" option.
    browser.getElement('show-notifications').addEventListener('change', (function () {
      this.showNotifications_ = browser.getElement('show-notifications').value;
    }).bind(this));

    // Set up "show-notifications" option.
    browser.getElement('notify-for-errors').addEventListener('change', (function () {
      this.notifyForErrors_ = browser.getElement('notify-for-errors').value;
    }).bind(this));

    browser.getElement('save-button').addEventListener('click', (function () {
      this.saveOptions();
    }).bind(this));
  }
}

// Singleton Options object.
export var options = new Options();

// Called to initialize the options page.
browser.callWhenLoaded(function () { options.onLoaded(); });
