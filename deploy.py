# Copyright 2019 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import re
import os
import sys
import zipfile

DEFAULT_ARCHIVE_NAME = 'store/gerrit-monitor.zip'
IGNORED_FILE_PATTERN = re.compile(r'\.DS_Store')


def Reformat(text):
  '''Reformat text by removing initial blank lines and left indentation.'''
  result = []
  prefix = None
  for line in text.splitlines():
    if not line and not result:
      continue
    if prefix is None:
      stripped_line = line.lstrip()
      prefix = len(line) - len(stripped_line)
    result.append(line[prefix:])
  return '\n'.join(result)


def Usage(retval, stream=None):
  '''Print script usage to |stream| and terminate with |retval|.'''
  stream = stream or sys.stderr
  stream.write(Reformat('''
      usage: python %s [archive]

      Creates a zip archive ready to deploy the extension on the Chrome
      Web Store. The archive name defaults to %s.
      ''' % (os.path.basename(__file__), DEFAULT_ARCHIVE_NAME)))
  sys.exit(retval)


def Main(args):
  if len(args) > 1:
    Usage(retval=1)

  archive_name = args[0] if args else DEFAULT_ARCHIVE_NAME
  with zipfile.ZipFile(archive_name, 'w', zipfile.ZIP_DEFLATED) as archive:
    for dirpath, dirnames, filenames in os.walk('src'):
      for filename in filenames:
        if IGNORED_FILE_PATTERN.match(filename):
          continue
        filepath = os.path.join(dirpath, filename)
        archive.write(
            filepath,
            os.path.join('gerrit-monitor', os.path.relpath(filepath, 'src')))


if __name__ == '__main__':
  Main(sys.argv[1:])
