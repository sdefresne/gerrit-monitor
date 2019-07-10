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

  if (namespace.config)
    return;

  var config = {};
  namespace.config = config;

  // Pattern matching a valid origin (protocol, host, port) supported by
  // the extension.
  config.ORIGIN_PATTERN = "(https?://[^/]*)(/[^/]+)*";
  config.ORIGIN_REGEXP = new RegExp('^' + config.ORIGIN_PATTERN);

  // Login prompt.
  config.LOGIN_PROMPT = ' Try logging in.';

  // Missing configuration.
  config.NO_HOST_ALLOWED = 'no host configured.';

  // Delay between automatic refresh of the badge data.
  config.REFRESH_DELAY_IN_MINUTES = 5;

  // Default options.
  config.DEFAULT_OPTIONS = {
    // URL of the gerrit instance to monitor.
    instances: [{
      name: 'Chromium',
      host: 'https://chromium-review.googlesource.com',
      enabled: false,
    },
    {
      name: 'Fuchsia',
      host: 'https://fuchsia-review.googlesource.com',
      enabled: false,
    }],
  };

})(this);
