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

import * as gerrit from './gerrit.js';

export const NO_CLS_MESSAGE = 'No CLs require your attention';

// The popup section headers.
export var POPUP_SECTION_DATA = {};

function pluralizedCl(count) {
  return (count == 1) ? 'CL' : 'CLs';
};

POPUP_SECTION_DATA[gerrit.Changelist.INCOMING_NEEDS_ATTENTION] = {
  className: 'incomingRequiringAttention',
  formatHeader: function(count) {
    return 'Incoming ' + pluralizedCl(count) + ' requiring your attention';
  },
};

POPUP_SECTION_DATA[gerrit.Changelist.OUTGOING_NEEDS_ATTENTION] = {
  className: 'outgoingRequiringAttention',
  formatHeader: function(count) {
    return 'Your ' + pluralizedCl(count) + ' requiring your attention';
  },
};

POPUP_SECTION_DATA[gerrit.Changelist.READY_TO_SUBMIT] = {
  className: 'approved',
  formatHeader: function(count) {
    return 'Approved, ready to submit';
  },
};

POPUP_SECTION_DATA[gerrit.Changelist.WIP] = {
  className: 'workInProgress',
  formatHeader: function(count) {
    return 'Your work in progress ' + pluralizedCl(count);
  },
};

POPUP_SECTION_DATA[gerrit.Changelist.NO_REVIEWERS] = {
  className: 'noReviewers',
  formatHeader: function(count) {
    return 'Your ' + pluralizedCl(count) + ' with no assigned reviewers';
  },
};

POPUP_SECTION_DATA[gerrit.Changelist.STALE] = {
  className: 'stale',
  formatHeader: function(count) {
    return 'Your stale ' + pluralizedCl(count);
  },
};

// The badge states.
export var BADGE_DATA = {};

BADGE_DATA[gerrit.Changelist.INCOMING_NEEDS_ATTENTION] = {
  icon: {
    '24': 'img/ic_assignment_incoming_24dp_1x.png',
    '48': 'img/ic_assignment_incoming_24dp_2x.png',
  },
  shouldNotify: true,
  color: '#9a0007',
  formatTitle: function(count) {
    return count + ' incoming ' + pluralizedCl(count) +
        ' requiring your attention';
  },
  notificationTitle: 'Incoming CL requiring your attention',
};

BADGE_DATA[gerrit.Changelist.OUTGOING_NEEDS_ATTENTION] = {
  icon: {
    '24': 'img/ic_assignment_outgoing_24dp_1x.png',
    '48': 'img/ic_assignment_outgoing_24dp_2x.png',
  },
  shouldNotify: true,
  color: '#4d2c91',
  formatTitle: function(count) {
    return count + ' of your ' + pluralizedCl(count) + ' requiring your attention';
  },
  notificationTitle: 'Outgoing CL requires attention',
};

BADGE_DATA[gerrit.Changelist.READY_TO_SUBMIT] = {
  icon: {
    '24': 'img/ic_assignment_approved_24dp_1x.png',
    '48': 'img/ic_assignment_approved_24dp_2x.png',
  },
  shouldNotify: true,
  color: '#004c40',
  formatTitle: function(count) {
    return count + ' of your ' + pluralizedCl(count) + ' ready to submit';
  },
  notificationTitle: 'Approved CL is ready to submit',
};

BADGE_DATA[gerrit.Changelist.STALE] = {
  icon: {
    '24': 'img/ic_assignment_stale_24dp_1x.png',
    '48': 'img/ic_assignment_stale_24dp_2x.png',
  },
  shouldNotify: false,
  color: '#004ba0',
  formatTitle: function(count) {
    return count + ' of your stale ' + pluralizedCl(count);
  },
  notificationTitle: 'CL has become stale',
};

BADGE_DATA[gerrit.Changelist.NO_REVIEWERS] = {
  icon: {
    '24': 'img/ic_assignment_not_ready_24dp_1x.png',
    '48': 'img/ic_assignment_not_ready_24dp_2x.png',
  },
  shouldNotify: false,
  color: '#8d8d8d',
  formatTitle: function(count) {
    return count + ' of your ' + pluralizedCl(count) + ' not assigned reviewers';
  },
  notificationTitle: 'CL has no reviewers set',
};

BADGE_DATA[gerrit.Changelist.WIP] = {
  icon: {
    '24': 'img/ic_assignment_not_ready_24dp_1x.png',
    '48': 'img/ic_assignment_not_ready_24dp_2x.png',
  },
  shouldNotify: false,
  color: '#8d8d8d',
  formatTitle: function(count) {
    return count + ' of your work in progress ' + pluralizedCl(count);
  },
  notificationTitle: 'CL marked as "work in progress"',
};

export const DEFAULT_BADGE_DATA = {
  text: '',
  title: NO_CLS_MESSAGE,
  shouldNotify: false,
  icon: {
    '24': 'img/ic_assignment_black_24dp_1x.png',
    '48': 'img/ic_assignment_black_24dp_2x.png',
  },
  color: '#41AF2B',
};

export const LOADING_BADGE_DATA = {
  text: '...',
  title: 'Refreshing...',
  shouldNotify: false,
  icon: {
    '24': 'img/ic_assignment_black_24dp_1x.png',
    '48': 'img/ic_assignment_black_24dp_2x.png',
  },
  color: 'black',
};

// The order of priority of sections (the first section with any CLs
// will determine the badge color).
export const SECTION_ORDERING = [
  gerrit.Changelist.INCOMING_NEEDS_ATTENTION,
  gerrit.Changelist.OUTGOING_NEEDS_ATTENTION,
  gerrit.Changelist.READY_TO_SUBMIT,
  gerrit.Changelist.STALE,
  gerrit.Changelist.NO_REVIEWERS,
  gerrit.Changelist.WIP,
];
