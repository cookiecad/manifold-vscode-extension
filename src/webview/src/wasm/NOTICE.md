
This project includes files derived from the Manifold library:
	https://github.com/elalish/manifold

Copyright (c) 2018-2025 Emmett Lalish and contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use these files except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Modifications and additions in this repository are by Loosetooth, 2025.

Notable modifications to the original Manifold worker code:

- Removed all top-level await statements from the worker script and its imports, ensuring compatibility with environments that do not support top-level await. Instead, initialization is handled within an async function that is called after the worker is set up.
- Added the ability to set the WASM URL dynamically, allowing the worker to load the WebAssembly binary from a location compatible with the VS Code extension webview environment.
