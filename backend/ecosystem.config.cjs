const dotenv = require('dotenv');
const path = require('path');
const env = dotenv.config({ path: path.join(__dirname, '.env') }).parsed;

module.exports = {
  apps: [{
    name: 'choicetime-backend',
    script: 'server.js',
    cwd: '/home/ubuntu/backend/ChoiceTime/backend',
    env: env
  }]
};
