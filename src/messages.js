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

  if (namespace.messages)
    return;

  var messages = {};
  namespace.messages = messages;

  messages.NO_CLS_MESSAGE = 'No CLs require your attention';

  // The popup section headers.
  var POPUP_SECTION_DATA = {};

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

  POPUP_SECTION_DATA[gerrit.Changelist.NOT_MAILED] = {
    className: 'notMailed',
    formatHeader: function(count) {
      return 'Your ' + pluralizedCl(count) + ' not mailed for review';
    },
  };

  POPUP_SECTION_DATA[gerrit.Changelist.STALE] = {
    className: 'stale',
    formatHeader: function(count) {
      return 'Your stale ' + pluralizedCl(count);
    },
  };

  messages.POPUP_SECTION_DATA = POPUP_SECTION_DATA;

  // The badge states.
  var BADGE_DATA = {};

  BADGE_DATA[gerrit.Changelist.INCOMING_NEEDS_ATTENTION] = {
    icon: {
      '24': 'img/ic_assignment_incoming_24dp_1x.png',
      '48': 'img/ic_assignment_incoming_24dp_2x.png',
    },
    color: '#9a0007',
    formatTitle: function(count) {
      return count + ' incoming ' + pluralizedCl(count) +
          ' requiring your attention';
    },
  };

  BADGE_DATA[gerrit.Changelist.OUTGOING_NEEDS_ATTENTION] = {
    icon: {
      '24': 'img/ic_assignment_outgoing_24dp_1x.png',
      '48': 'img/ic_assignment_outgoing_24dp_2x.png',
    },
    color: '#4d2c91',
    formatTitle: function(count) {
      return count + ' of your CLs requiring your attention';
    },
  };

  BADGE_DATA[gerrit.Changelist.READY_TO_SUBMIT] = {
    icon: {
      '24': 'img/ic_assignment_approved_24dp_1x.png',
      '48': 'img/ic_assignment_approved_24dp_2x.png',
    },
    color: '#004c40',
    formatTitle: function(count) {
      return count + ' of your CLs ready to submit';
    },
  };

  BADGE_DATA[gerrit.Changelist.STALE] = {
    icon: {
      '24': 'img/ic_assignment_stale_24dp_1x.png',
      '48': 'img/ic_assignment_stale_24dp_2x.png',
    },
    color: '#004ba0',
    formatTitle: function(count) {
      return count + ' of your stale CLs';
    },
  };

  BADGE_DATA[gerrit.Changelist.NOT_MAILED] = {
    icon: {
      '24': 'img/ic_assignment_not_mailed_24dp_1x.png',
      '48': 'img/ic_assignment_not_mailed_24dp_2x.png',
    },
    color: '#8d8d8d',
    formatTitle: function(count) {
      return count + ' of your CLs not sent for review';
    },
  };

  messages.BADGE_DATA = BADGE_DATA;

  messages.DEFAULT_BADGE_DATA = {
    text: '',
    title: messages.NO_CLS_MESSAGE,
    icon: {
      '24': 'img/ic_assignment_black_24dp_1x.png',
      '48': 'img/ic_assignment_black_24dp_2x.png',
    },
    color: '#41AF2B',
  };

  messages.LOADING_BADGE_DATA = {
    text: '...',
    title: 'Refreshing...',
    icon: {
      '24': 'img/ic_assignment_black_24dp_1x.png',
      '48': 'img/ic_assignment_black_24dp_2x.png',
    },
    color: 'black',
  };

  // The order of priority of sections (the first section with any CLs
  // will determine the badge color).
  var SECTION_ORDERING = [
    gerrit.Changelist.INCOMING_NEEDS_ATTENTION,
    gerrit.Changelist.OUTGOING_NEEDS_ATTENTION,
    gerrit.Changelist.READY_TO_SUBMIT,
    gerrit.Changelist.STALE,
    gerrit.Changelist.NOT_MAILED,
  ];

  messages.SECTION_ORDERING = SECTION_ORDERING;

})(this);
