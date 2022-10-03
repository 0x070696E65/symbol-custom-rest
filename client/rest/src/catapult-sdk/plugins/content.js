const ModelType = require('../model/ModelType');

const content = {
    registerSchema: builder => {
        builder.addSchema('content.mosaicAlias', {
            'height':   ModelType.uint64,
            'mosaicId': ModelType.uint64HexIdentifier,
            'action':   ModelType.int,
        });
        builder.addSchema('content', {
            'namespaceId': ModelType.string,
            'mosaicAlias': { type: ModelType.array, schemaName: 'content.mosaicAlias' }
        });
    },

    registerCodecs: () => {},
};

module.exports = content;