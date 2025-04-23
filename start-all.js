const { fork } = require('child_process');

const path = require('path');

fork(path.join(__dirname, 'index.js'));           // MCP server (port 3000)
fork(path.join(__dirname, 'Openai-router.js'));   // GPT router (port 4000)

