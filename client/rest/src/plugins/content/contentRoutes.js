const routeUtils = require('../../routes/routeUtils');
const { convertToLong } = require('../../db/dbUtils');
const catapult = require('../../catapult-sdk');
const { uint64 } = catapult.utils;

module.exports = {
    register: (server, db, services) => {
		const mosaicSender = routeUtils.createSender('mosaicDescriptor');
        // mosaicid取得
		// server.get('/content', (req, res, next) => {
		// 	const ownerAddress = req.params.ownerAddress ? routeUtils.parseArgument(req.params, 'ownerAddress', 'address') : undefined;

		// 	const options = routeUtils.parsePaginationArguments(req.params, services.config.pageSize, { id: 'objectId' });

		// 	return db.mosaics(ownerAddress, options)
		// 		.then(result => {
        //             // ここからメタデータ解析をしたい
		// 			console.log(result)
        //             mosaicSender.sendPage(res, next)(result)
        //         });
            
		// });
		
		// mosaicid取得
		server.get('/content/:mosaicId', (req, res, next) => {
			// const ownerAddress = req.params.ownerAddress ? routeUtils.parseArgument(req.params, 'ownerAddress', 'address') : undefined;
			const id = convertToLong(routeUtils.parseArgument(req.params, 'mosaicId', uint64.fromHex));

			// const options = routeUtils.parsePaginationArguments(req.params, services.config.pageSize, { id: 'objectId' });
			// dbにモザイクを渡す
			console.log(id)
			return db.mosaicsByIds([id])
				.then(result => {
                    // ここでdbにモザイクidを渡す
					// console.log(result)
					const alias = result.map(x => {
						return {
							version: x.mosaic.version,
							// address: x.mosaic.ownerAddress,
						}
					});
                    // mosaicSender.sendPage(res, next)(result)
					console.log(alias)
					// 多分ここでres.send()してる
					routeUtils.createSender('content').sendImage(res, next)(
						"test"
					);
					// fs.readFile("../README.md", (err, data) => {
					// 	res
					// 	res.write(data);
					// 	res.end();
					//   });
						// res.writeHead(200);
					// res.write(Buffer.from(test, 'base64'));
					// res.end();

					// next();
                });
            
		});

		// routeUtils.addGetPostDocumentRoutes(
		// 	server,
		// 	mosaicSender,
		// 	{ base: '/content', singular: 'mosaicId', plural: 'mosaicIds' },
		// 	params => db.mosaicsByIds(params),//ここでmosaicsByIdsに流しidを送っている
		// 	uint64.fromHex
		// );
    }
};