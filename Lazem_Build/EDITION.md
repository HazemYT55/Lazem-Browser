# Lazem_Build

Edition label from Hazem (his words, WhatsApp Nov 27 2026): "Lazem_Build -> 75% for lazem 25%others"

Status: this folder holds the shared Lazem Browser core (Electron desktop browser, v0.1). All three edition folders currently contain the same code. Edition-specific differences are not defined yet and nothing here is edition-specific except edition.json (the name shown on the new-tab page and in the window title).

Works (tested on Linux only): tabs, address bar and search with engine picker, back/forward, bookmarks, built-in ad blocking (blocklist.txt, about 40 domains), new-tab page with draggable shortcut tiles and folders, background color or image.
Not built: VPN, extension language, offline mode, Lazem Search, lazem domains, publishing, installer.
Not tested: Windows, Mac.

Run: install Node.js, then in this folder run "npm install" and "npm start" (or run-windows.bat on Windows). See README-AR.txt.
