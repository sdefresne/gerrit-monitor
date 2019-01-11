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

(function(namespace) {

  if (namespace.popup)
    return;

  var popup = {};
  namespace.popup = popup;

  // The main widget in the popup.
  function PopupWidget() {
    this.sections_ = [];
  }

  // Returns the section widgets displayed in this popup widget.
  PopupWidget.prototype.getSections = function() {
    return this.sections_;
  };

  // Adds a section widget to this popup.
  PopupWidget.prototype.addSection = function(section) {
    if (section != null)
      this.sections_.push(section);
  };

  // Renders this widget using the given builder.
  PopupWidget.prototype.render = function(builder) {
    this.sections_.forEach(function(section) {
      section.render(builder);
    });
  };

  // Returns a new PopupWidget from search results.
  PopupWidget.create = function(results) {
    var categories = results.getCategoryMap();

    // Add sections in priority order.
    var widget = new PopupWidget();
    messages.SECTION_ORDERING.forEach(function(attention) {
      if (categories.has(attention)) {
        widget.addSection(SectionWidget.create(
            attention, categories.get(attention)));
      }
    });

    return widget;
  };

  // A widget displaying a section of CLs.
  function SectionWidget(attention) {
    this.attention_ = attention;
    this.cls_ = [];
  }

  // Adds a CL to be dislayed under this section.
  SectionWidget.prototype.addChangelist = function(cl) {
    this.cls_.push(cl);
  };

  // Renders this widget using the given builder.
  SectionWidget.prototype.render = function(builder) {
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
  };

  // Returns a new SectionWidget with the CLs for the attention.
  SectionWidget.create = function(attention, cls) {
    var widget = new SectionWidget(attention);
    cls.forEach(function(cl) {
      widget.addChangelist(ChangelistWidget.wrap(cl));
    });
    return widget;
  }

  // A widget displaying a single CL.
  function ChangelistWidget(cl) {
    this.cl_ = cl;
  }

  // Returns an Url to open Gerrit at this CL.
  ChangelistWidget.prototype.getGerritUrl = function() {
    return this.cl_.getGerritUrl();
  };

  // Returns the author of this CL.
  ChangelistWidget.prototype.getAuthor = function() {
    return this.cl_.getAuthor();
  };

  // Returns the class of the status marker to use for this CL.
  ChangelistWidget.prototype.getStatusMarker = function() {
    // Do not use colored status marker for the moment as the output feels
    // to crowded. TODO(sdefresne): revisit this eventually.
    return '';

    if (this.cl_.hasUnresolvedComments())
      return 'tbr';
    if (this.cl_.isSubmittable())
      return 'lgtm';
    return 'pending';
  };

  // Returns the CL size category.
  ChangelistWidget.prototype.getSizeCategory = function() {
    return this.cl_.getSizeCategory();
  };

  // Returns the list of reviewers of this CL.
  ChangelistWidget.prototype.getReviewers = function() {
    return this.cl_.getReviewers();
  };

  // Returns the CL description.
  ChangelistWidget.prototype.getDescription = function() {
    return this.cl_.getDescription();
  };

  // Configure click event on the table row.
  ChangelistWidget.prototype.setHeader = function(node) {
    node.addEventListener('click', (function() {
      browser.openUrl(this.getGerritUrl());
    }).bind(this));
  };

  // Renders this widget using the given builder.
  ChangelistWidget.prototype.render = function(builder) {
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
  };

  // Creates a changelist widget based on the given CL.
  ChangelistWidget.wrap = function(cl) {
    return new ChangelistWidget(cl);
  };

  // Renders the main widget as part of the DOM.
  popup.renderWidget = function(widget) {
    if (widget.getSections().length === 0) {
      popup.setOverlayText(messages.NO_CLS_MESSAGE + '.');
      popup.setOverlayVisible(true);
    } else {
      widget.render(dombuilder.DomBuilder.attach(
          browser.getElement('results')));
      popup.setOverlayVisible(false);
    }
  };

  // Does almost all the work of rendering the popup: fetches data, process
  // it appropriately, constructs the widgets. The only thing it doesn't do
  // is render the widget on the DOM.
  popup.getMainWidget = function() {
    browser.displayLoading();
    return popup.getSearchResults()
      .then(PopupWidget.create);
  };

  // Shows the given error message. If the error message asks the user to
  // login or refresh cookies, the login link will be shown too.
  popup.displayError = function(error) {
    var error_string = String(error);

    popup.setOverlayText(error_string);
    popup.setOverlayVisible(true);

    // Presents a link to gerrit host if required.
    popup.setLoginLinkVisible(
        error_string.includes(config.LOGIN_PROMPT));

    // Presents a button to grant permissions if required.
    popup.setGrantPermissionsButtonVisible(
        error_string.includes(config.NO_HOST_ALLOWED));
  };

  // Sets the message text of the overlay panel.
  popup.setOverlayText = function(value) {
    browser.getElement('overlay-text').innerText = value;
  };

  // Toggles visibility of the overlay panel. The login link, if visible,
  // will be hidden together with the overlay.
  popup.setOverlayVisible = function(visible) {
    if (visible) {
      browser.getElement('overlay').style.display = null;
      browser.getElement('results').style.display = 'none';
    } else {
      browser.getElement('overlay').style.display = 'none';
      browser.getElement('results').style.display = null;
      popup.setGrantPermissionsButtonVisible(false);
      popup.setLoginLinkVisible(false);
    }
  };

  // Toggles visibility of the login link in the overlay. Requires the
  // overlay to be visible as well.
  popup.setLoginLinkVisible = function(visible) {
    popup.setElementVisibility('login', visible);
    if (!visible) {
      return;
    }

    var login = browser.getElement('login');
    while (login.firstChild) {
      login.removeChild(login.firstChild);
    }

    gerrit.fetchAllowedInstances()
      .then(function(instances) {
        dombuilder.DomBuilder.attach(login)
          .begin('div')
            .forEach(instances, function(instance, builder, index) {
              builder
                .begin('a')
                  .setAttribute('target', '_blank')
                  .setAttribute('href', instance.host)
                  .appendText(instance.name)
                .end('a')
                .begin('br')
                .end('br')
            })
          .end('div')
      });
  };

  // Presents a button to allow user to grant permissions to access the gerrit
  // host (should eventually move to the configuration page).
  popup.setGrantPermissionsButtonVisible = function(visible) {
    popup.setElementVisibility('permissions', visible);
    if (visible) {
      var button = browser.getElement('permissions-button');
      button.addEventListener('click', function() {
        browser.openOptionsPage();
      });
    }
  };

  // Configure the visibility of the element with the given identitifer.
  popup.setElementVisibility = function(identifier, visible) {
    browser.getElement(identifier).style.display = visible ? null : 'none';
  };

  // Calls the badge page to get the search results.
  popup.getSearchResults = function() {
    return gerrit.fetchAllowedInstances().then(function(instances) {
      var hosts = instances.map(function(instance) { return instance.host; });
      return comm.sendMessage('getSearchResults', hosts)
        .then(function(results) {
          return Promise.resolve(new gerrit.SearchResults(results.map(
            function(result) {
              return gerrit.SearchResult.wrap(
                result.host, result.user, result.data);
            })));
        });
    });
  };

  // Main method.
  popup.onLoaded = function() {
    popup.getMainWidget()
      .then(popup.renderWidget)
      .catch(popup.displayError);
  };

  // Called to initialize the popup.
  browser.callWhenLoaded(popup.onLoaded);

})(this);
