const ContentDb = require('./contentDb');
const contentRoutes = require('./contentRoutes');

module.exports = {
    createDb: db => new ContentDb(db),

    registerTransactionStates: () => {},

    registerMessageChannels: () => {},

    registerRoutes: (...args) => {
        contentRoutes.register(...args);
    }
};