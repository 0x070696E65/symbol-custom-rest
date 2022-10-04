const ContentDb = require('./ContentDb');
const contentRoutes = require('./contentRoutes');

module.exports = {
    createDb: db => new ContentDb(db),

    registerTransactionStates: () => {},

    registerMessageChannels: () => {},

    registerRoutes: (...args) => {
        contentRoutes.register(...args);
    }
};