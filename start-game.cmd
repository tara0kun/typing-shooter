@echo off
rem Starts the game: the Vite dev server on a port of its own, which then opens the game in the default browser.
rem Closing this window stops the server. Started again while it runs, the port is taken, so it only opens the browser.
title NIGHT TYPIST
cd /d "%~dp0"
node node_modules\vite\bin\vite.js --port 5180 --strictPort --open || start "" http://localhost:5180/
