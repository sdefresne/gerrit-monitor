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
import * as comm from './comm.js';
import * as config from './config.js';
import * as dombuilder from './dombuilder.js';
import * as gerrit from './gerrit.js';
import * as messages from './messages.js';

// The main widget in the popup.
class PopupWidget {
  constructor() {
    this.sections_ = [];
  }

  // Returns the section widgets displayed in this popup widget.
  getSections() {
    return this.sections_;
  }

  // Adds a section widget to this popup.
  addSection(section) {
    if (section != null)
      this.sections_.push(section);
  }

  // Renders this widget using the given builder.
  render(builder) {
    this.sections_.forEach(function (section) {
      section.render(builder);
    });
  }

  // Returns a new PopupWidget from search results.
  static create(results) {
    var categories = results.getCategoryMap();

    // Add sections in priority order.
    var widget = new PopupWidget();
    messages.SECTION_ORDERING.forEach(function (attention) {
      if (categories.has(attention)) {
        widget.addSection(SectionWidget.create(
            attention, categories.get(attention)));
      }
    });

    return widget;
  }
}

// A widget displaying a section of CLs.
class SectionWidget {
  constructor(attention) {
    this.attention_ = attention;
    this.cls_ = [];
  }

  // Adds a CL to be dislayed under this section.
  addChangelist(cl) {
    this.cls_.push(cl);
  }

  // Renders this widget using the given builder.
  render(builder) {
    var data = messages.POPUP_SECTION_DATA[this.attention_];
    builder
      .begin('div')
        .addClass('section')
        .addClass(data.className)
        .begin('div')
          .appendText(data.formatHeader(this.cls_.length))
          .addClass('sectionheader')
        .end('div')
        .forEach(this.cls_, function(cl, builder, index) {
          cl.render(builder);
        })
      .end('div');
  }

  // Returns a new SectionWidget with the CLs for the attention.
  static create(attention, cls) {
    var widget = new SectionWidget(attention);
    cls.forEach(function (cl) {
      widget.addChangelist(ChangelistWidget.wrap(cl));
    });
    return widget;
  }
}

// A widget displaying a single CL.
class ChangelistWidget {
  constructor(cl) {
    this.cl_ = cl;
  }

  // Returns an Url to open Gerrit at this CL.
  getGerritUrl() {
    return this.cl_.getGerritUrl();
  }

  // Returns the author of this CL.
  getAuthor() {
    return this.cl_.getAuthor();
  }

  // Returns the class of the status marker to use for this CL.
  getStatusMarker() {
    // Do not use colored status marker for the moment as the output feels
    // to crowded. TODO(sdefresne): revisit this eventually.
    return '';

    if (this.cl_.hasUnresolvedComments())
      return 'tbr';
    if (this.cl_.isSubmittable())
      return 'lgtm';
    return 'pending';
  }

  // Returns the CL size category.
  getSizeCategory() {
    return this.cl_.getSizeCategory();
  }

  // Returns the list of reviewers of this CL.
  getReviewers() {
    return this.cl_.getReviewers();
  }

  // Returns the CL description.
  getDescription() {
    return this.cl_.getDescription();
  }

  // Configure click event on the table row.
  setHeader(node) {
    node.addEventListener('click', (function () {
      browser.openUrl(this.getGerritUrl(), true);
    }).bind(this));
  }

  // Renders this widget using the given builder.
  render(builder) {
    builder
      .begin('div')
        .addClass('changelist')
        .begin('div')
          .addClass('changelistheader')
          .withCurrentNode(this.setHeader.bind(this))
          .begin('table')
            .addClass('changelisttable')
            .begin('tr')
              .begin('td')
                .begin('div')
                  .addClass('statusmarker')
                  .begin('div')
                    .addClass('marker')
                    .addClass(this.getStatusMarker() + 'marker')
                    .addClass(this.getSizeCategory() + 'size')
                  .end('div')
                .end('div')
              .end('td')
              .begin('td')
                .begin('div')
                  .addClass('author')
                  .appendText(this.getAuthor())
                .end('div')
              .end('td')
              .begin('td')
                .begin('div')
                  .addClass('reviewers')
                  .forEach(this.getReviewers(), function(info, builder, index) {
                    if (index > 0)
                      builder.appendText(', ');
                    var lgtm = info.value > 0;
                    builder
                      .begin('span')
                        .addClass(lgtm ? 'lgtmreviewer' : 'nolgtmreviewer')
                        .appendText(info.name)
                      .end('span');
                  })
                .end('div')
              .end('td')
              .begin('td')
                .begin('div')
                  .addClass('description')
                  .appendText(this.getDescription().getMessage())
                .end('div')
              .end('td')
            .end('tr')
          .end('table')
        .end('div')
      .end('div');
  }

  // Creates a changelist widget based on the given CL.
  static wrap(cl) {
    return new ChangelistWidget(cl);
  }
}

// Fetch data from the servers, then display the popup.
function displayPopup() {
  // Update the badge to show a loading state.
  browser.displayLoading();

  // Fetch the data from the servers, and then display the popup. The
  // promise returned by getSearchResults() is only rejected if there
  // are no servers configured, so deal appropriately with the error.
  return getSearchResults()
    .then(function(wrapper) {
      var hideOverlay = false;
      if (wrapper.results !== undefined) {
        var widget = PopupWidget.create(wrapper.results);
        if (widget.getSections().length === 0) {
          setOverlayText(messages.NO_CLS_MESSAGE + '.');
          setElementVisibility('results', false);
        } else {
          widget.render(dombuilder.DomBuilder.attach(
              browser.getElement('results')));
          setElementVisibility('results', true);
          hideOverlay = true;
        }
      }

      if (wrapper.errors.length !== 0) {
        setLogginButtonVisible(
          wrapper.errors[0].error,
          wrapper.errors.map(function(error) {
            return error.host;
          }));
        hideOverlay = false;
      }

      setOverlayVisible(!hideOverlay);
    })
    .catch(function(error) {
      setGrantPermissionsButtonVisible(String(error));
    });
}

// Sets the message text of the overlay panel.
function setOverlayText(value) {
  browser.getElement('overlay-text').innerText = value;
};

// Toggles visibility of the overlay panel. The login link, if visible,
// will be hidden together with the overlay.
function setOverlayVisible(visible) {
  setElementVisibility('overlay', visible);
};

// Toggles visibility of the login button in the overlay. Requires the
// overlay to be visible as well. If limit_to_those_hosts is defined,
// then it can be used to restrict the button to only open a subset of
// the hosts.
function setLogginButtonVisible(overlay_text, limit_to_those_hosts) {
  setOverlayText(overlay_text);
  setElementVisibility('login', true);

  var button = browser.getElement('login-button');
  button.addEventListener('click', function() {
    browser.loadOptions().then(function(options) {
      gerrit.fetchAllowedInstances(options).then(function(instances) {
        instances.forEach(function (instance) {
          var host = instance.host;
          if (!limit_to_those_hosts || limit_to_those_hosts.indexOf(host) != -1)
            browser.openUrl(host + '/dashboard/self', false);
        });
      });
    });
  });
};

// Presents a button to allow user to grant permissions to access the gerrit
// host (should eventually move to the configuration page).
function setGrantPermissionsButtonVisible(overlay_text) {
  setOverlayText(overlay_text);
  setElementVisibility('permissions', true);

  var button = browser.getElement('permissions-button');
  button.addEventListener('click', function() {
    browser.openOptionsPage();
  });
};

// Configure the visibility of the element with the given identitifer.
function setElementVisibility(identifier, visible) {
  browser.getElement(identifier).style.display = visible ? null : 'none';
};

// Calls the badge page to get the search results.
function getSearchResults() {
  return browser.loadOptions().then(function(options) {
    return gerrit.fetchAllowedInstances(options).then(function(instances) {
      var hosts = instances.map(function(instance) { return instance.host; });
      return comm.sendMessage('getSearchResults', hosts).then(
        function(wrapper) {
          var results = undefined;
          if (wrapper.results.length !== 0) {
            results = new gerrit.SearchResults(wrapper.results.map(
              function(result) {
                return gerrit.SearchResult.wrap(
                  result.host, result.user, result.data, options);
              }));
          }

          return Promise.resolve({
            results: results,
            errors: wrapper.errors
          });
      });
    });
  });
};

// Main method.
function onLoaded() {
  displayPopup();
};

// Called to initialize the popup.
browser.callWhenLoaded(onLoaded);
