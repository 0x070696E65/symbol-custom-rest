const routeUtils = require('../../routes/routeUtils');
const { convertToLong } = require('../../db/dbUtils');
const catapult = require('../../catapult-sdk');
const { uint64 } = catapult.utils;


module.exports = {
    register: (server, db, services) => {
		const mosaicSender = routeUtils.createSender('mosaicDescriptor');
        // mosaicid取得
		server.get('/content', (req, res, next) => {
			const ownerAddress = req.params.ownerAddress ? routeUtils.parseArgument(req.params, 'ownerAddress', 'address') : undefined;

			const options = routeUtils.parsePaginationArguments(req.params, services.config.pageSize, { id: 'objectId' });

			return db.mosaics(ownerAddress, options)
				.then(result => {
                    // ここからメタデータ解析をしたい
                    mosaicSender.sendPage(res, next)(result)
                });
            
		});

		routeUtils.addGetPostDocumentRoutes(
			server,
			mosaicSender,
			{ base: '/content', singular: 'mosaicId', plural: 'mosaicIds' },
			params => db.mosaicsByIds(params),
			uint64.fromHex
		);
    }
};