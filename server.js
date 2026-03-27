require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const START_PORT = Number(process.env.PORT || 3005);
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.kochi.one';
const baseNoSlash = String(API_BASE_URL).replace(/\/$/, '');
const LOGO_URL =
  process.env.LOGO_URL || `${baseNoSlash}/aakriti-logo.png`;

const indexHtmlPath = path.join(__dirname, 'index.html');
const loginHtmlPath = path.join(__dirname, 'login.html');

function sendIndexPage(res) {
  const raw = fs.readFileSync(indexHtmlPath, 'utf8');
  const html = raw.replace(/\{\{AAKRITI_LOGO_SRC\}\}/g, LOGO_URL);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.type('html').send(html);
}

function sendLoginPage(res) {
  // Read from disk each time so edits to login.html apply without restarting the server.
  const raw = fs.readFileSync(loginHtmlPath, 'utf8');
  const html = raw.replace(/\{\{AAKRITI_LOGO_SRC\}\}/g, LOGO_URL);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.type('html').send(html);
}

// Register / and /config.js before express.static — otherwise static serves
// index.html for GET / and {{AAKRITI_LOGO_SRC}} is never replaced.
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.send(
    `window.APP_CONFIG = ${JSON.stringify({ API_BASE_URL, LOGO_URL })};`
  );
});

app.get('/', (req, res) => sendIndexPage(res));

/** Staff / salon admin login (API auth on kochi_one_server). */
app.get('/login', (req, res) => sendLoginPage(res));
app.get('/aakriti/login', (req, res) => sendLoginPage(res));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'aakriti.kochi.one' });
});

app.use(express.static(__dirname, { index: false }));

function startServer(port, attemptsLeft) {
  const server = app.listen(port, () => {
    console.log(`Aakriti site running on http://localhost:${port}`);
    console.log(`Using API base URL: ${API_BASE_URL}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`Port ${port} is in use. Trying ${port + 1}...`);
      startServer(port + 1, attemptsLeft - 1);
      return;
    }
    throw error;
  });
}

startServer(START_PORT, 5);
