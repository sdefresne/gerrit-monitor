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

// Implementation of a Map type.

export function Map() {
  this.entries_ = {};
  this.size_ = 0;
};

Map.prototype.put = function(key, value) {
  if (!this.has(key))
    this.size_++;
  this.entries_[key] = value;
  return this;
};

Map.prototype.remove = function(key) {
  if (!this.has(key))
    return false;
  delete this.entries_[key];
  this.size_--;
  return true;
};

Map.prototype.get = function(key, optDefault) {
  return this.has(key) ? this.entries_[key] : optDefault;
};

Map.prototype.has = function(key) {
  return this.entries_.hasOwnProperty(key);
};

Map.prototype.isEmpty = function() {
  return this.size_ == 0;
};

Map.prototype.toJSON = function() {
  return this.entries_;
};

Map.prototype.forEach = function(thunk) {
  for (var prop in this.entries_) {
    if (this.has(prop))
      thunk(prop, this.get(prop));
  }
};

Map.wrap = function(object) {
  var map = new Map();
  for (var prop in object) {
    if (object.hasOwnProperty(prop))
      map.put(prop, object[prop]);
  }
  return map;
};
