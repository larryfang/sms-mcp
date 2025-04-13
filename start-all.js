const { fork } = require('child_process');

fork('./index.js');         // MCP server (port 3000)
fork('./Openai-router.js'); // GPT chat server (port 4000)
