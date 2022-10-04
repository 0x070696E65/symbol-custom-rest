const ModelType = require('../model/ModelType');

const content = {
    registerSchema: builder => {
        builder.addSchema('content.state', {
            'version':   ModelType.int,
        });
        builder.addSchema('content', {
            'info': ModelType.int,
            'mosaicAlias': { type: ModelType.array, schemaName: 'content.state' }
        });
    },

    registerCodecs: () => {},
};

module.exports = content;