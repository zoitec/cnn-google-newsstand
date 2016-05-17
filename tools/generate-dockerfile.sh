#!/bin/bash

# Copyright 2016 Turner Broadcasting System, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

NODE_TYPE='node'
NODE_ENGINE=$(jq -r .engines.node package.json)
PACKAGE_NAME=$(jq -r .name package.json)
START_COMMAND='node'
PACKAGE_MAIN=$(jq -r .main package.json)

sed "s/@@nodeType/${NODE_TYPE}/g;\
    s/@@nodeEngine/${NODE_ENGINE}/g;\
    s/@@packageName/${PACKAGE_NAME}/g;\
    s/@@startCommand/${START_COMMAND}/g;\
    s/@@packageMain/${PACKAGE_MAIN}/g;" Dockerfile.template > Dockerfile
