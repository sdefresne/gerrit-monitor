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
import * as utils from './utils.js';

// Represents an image set.
export function ImageSet(icon) {
  this.icon_ = utils.Map.wrap(icon);
  this.size_ = null;
}

// Returns the size of the smallest image in the set.
ImageSet.prototype.getBaseSize = function() {
  if (this.size_ === null) {
    var keys = [];
    this.icon_.forEach(function(key, value) {
      keys.push(Number(key));
    });
    keys.sort();
    this.size_ = keys[0];
  }
  return this.size_;
};

// Returns the default image in the set.
ImageSet.prototype.getDefaultImage = function() {
  return this.icon_.get(this.getBaseSize());
};

// Returns the source set for the additional images.
ImageSet.prototype.getExtraImageSet = function() {
  var srcset = '';
  var baseSize = this.getBaseSize();
  this.icon_.forEach(function(key, value) {
    var size = Number(key);
    if (size == baseSize)
      return;
    if (srcset !== '')
      srcset += ', ';
    srcset += value + ' ' + (size / baseSize) + 'x';
  });
  return srcset;
}

// Quick and dirty DOM construction framework.
export function DomBuilder(parent) {
  this.stack = [parent];
  this.current = parent;
}

// Returns a new DOM builder that attaches to the given element.
DomBuilder.attach = function(element) {
  return new DomBuilder(element);
};

// Begins a new element with the given tag name, attaching it
// to the current element.
DomBuilder.prototype.begin = function(tagName) {
  var element = browser.createElement(tagName);
  this.current.appendChild(element);
  this.stack.push(element);
  this.current = element;
  return this;
};

// Appends a string to the current element.
DomBuilder.prototype.appendText = function(str) {
  this.current.appendChild(browser.createTextNode(str));
  return this;
};

// Sets the 'src' and 'srcset' attributes from an 'icon' object.
DomBuilder.prototype.setImageSet = function(icon) {
  var iconset = new ImageSet(icon);
  this.setAttribute('src', iconset.getDefaultImage());
  this.setAttribute('srcset', iconset.getExtraImageSet());
  return this;
};

// Sets an attibute on the current element.
DomBuilder.prototype.setAttribute = function(name, value) {
  this.current[name] = value;
  return this;
};

// Adds a CSS class name to the current element.
DomBuilder.prototype.addClass = function(name) {
  if (this.current.className) {
    this.current.className += ' ' + name;
  } else {
    this.current.className = name;
  }
  return this;
};

// Invokes the given thunk for each element in the collection, passing
// the element, this builder, and the index of the element. Useful for
// building subtrees of variable length.
DomBuilder.prototype.forEach = function(elements, thunk) {
  var index = 0;
  elements.forEach((function(element) {
    thunk(element, this, index++);
  }).bind(this));
  return this;
};

// Invokes the given thunk with the current node.
DomBuilder.prototype.withCurrentNode = function(thunk) {
  thunk(this.current);
  return this;
};

// Ends the current element and replaces it as the current with
// its parent.
DomBuilder.prototype.end = function() {
  this.stack.pop();
  this.current = this.stack[this.stack.length - 1];
  return this;
};
