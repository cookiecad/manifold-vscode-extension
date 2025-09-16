// Copyright 2024 The Manifold Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { initManifold, setWasmUrl } from '../lib/evaluate';
import {cleanup, evaluateCADToModel, initEvaluator} from './worker';

// Setup complete
self.postMessage(null);

let initialized = false;
let wasmUrl: string | undefined = undefined;


if (self.console) {
  const oldLog = self.console.log;
  self.console.log = function(...args) {
    let message = '';
    for (const arg of args) {
      if (arg == null) {
        message += 'undefined';
      } else if (typeof arg == 'object') {
        message += JSON.stringify(arg, null, 4);
      } else {
        message += arg.toString();
      }
    }
    self.postMessage({log: message});
    oldLog(...args);
  };
}

self.onmessage = async (e) => {
  // If this is the init message, store the wasmUrl
  if (e.data?.type === 'init' && e.data.wasmUrl) {
    wasmUrl = e.data.wasmUrl;
    setWasmUrl(wasmUrl as string);
    return;
  }
  try {
    if (!initialized) {
      await initManifold();
      await initEvaluator();
      initialized = true;
    }
    const result = await evaluateCADToModel(e.data.code);
    self.postMessage(result);
  } catch (error: any) {
    console.error('Worker caught error', error);
    console.log(error.toString());
    self.postMessage({objectURL: null});
  } finally {
    cleanup();
  }
};
