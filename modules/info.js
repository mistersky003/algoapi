const app = require('../package.json')
const jsonInfo = {
    status: 200,
    name: app.name,
    version: app.version
};

module.exports = jsonInfo;