/* eslint-disable no-console */
const metal = require('./metal');
const catapult = require('../../catapult-sdk');
const { convertToLong } = require('../../db/dbUtils');
// eslint-disable-next-line import/order
const routeUtils = require('../../routes/routeUtils');

const { uint64 } = catapult.utils;
const errors = require('../../server/errors');

const is_tx = data => {
	try {
		const res = JSON.parse(data.buffer.toString());
		if (Array.isArray(res))
			return res.map(value => routeUtils.namedParserMap.hash256(value));
		return undefined;
	} catch (error) {
		return undefined;
	}
};

const numCompare = (a, b) => {
	const numA = Number(a.split('#', 2)[0]);
	const numB = Number(b.split('#', 2)[0]);

	let comparison = 0;
	if (numA > numB)
		comparison = 1;
	else if (numA < numB)
		comparison = -1;

	return comparison;
};
module.exports = {
	register: (server, db) => {
		// eslint-disable-next-line consistent-return
		server.get('/content/comsa/:mosaicId', (req, res, next) => {
			try {
				const targetId = convertToLong(routeUtils.parseArgument(req.params, 'mosaicId', uint64.fromHex));
				const metadataType = 1;
				const options = {
					sortField: 'id', sortDirection: 1, pageSize: 1000, pageNumber: 1
				};
				return db.metadataEntry(targetId, metadataType, options)
					.then(result => {
						const meta = result.data;
						const hashes = [];
						const payload = [];
						let mime = '';
						meta.forEach(m => {
							// eslint-disable-next-line no-shadow
							const res = is_tx(m.metadataEntry.value);
							if (res !== undefined)
								hashes.push(...res);
						});
						// parse txs
						db.transactionsByHashes(hashes)
							.then(txs => {
								if (400 < txs.length)
									// eslint-disable-next-line no-throw-literal
									throw 'Large file is not allowed';
								txs.forEach(agg => {
									if (!(1 < agg.transaction.transactions.length
										// eslint-disable-next-line max-len
										&& null != agg.transaction.transactions[1].transaction.message?.buffer.slice(1).toString().match(/^00000#/)
										&& 99 > agg.transaction.transactions.length)) {
										if ('' === mime)
											// eslint-disable-next-line max-len
											mime = JSON.parse(agg.transaction.transactions[0].transaction.message?.buffer.slice(1).toString()).mime_type;
										agg.transaction.transactions.slice(1).forEach(itx => {
											payload.push(itx.transaction.message.buffer.slice(1).toString());
										});
									}
								});
								routeUtils.createSender('content').sendContent(res, next)(
									Buffer.from(payload.filter(v => v).sort(numCompare).map(r => r.split('#', 2)[1]).join(), 'base64'),
									mime
								);
							});
					});
			} catch (e) {
				res.send(errors.createInternalError('error retrieving data'));
			}
		});
		// eslint-disable-next-line consistent-return
		server.get('/content/metal/:metalId', (req, res, next) => {
			try {
				const { metalId } = req.params;
				console.log(metalId);
				// const compositeHash = routeUtils.parseArgument(metal.restoreMetadataHash(metalId), 'compositeHash', 'hash256');
				const compositeHash = {
					compositeHash: metal.restoreMetadataHash(metalId)
				};
				console.log(compositeHash);
				const compositeHashes = routeUtils.parseArgument(compositeHash, 'compositeHash', 'hash256');
				console.log(compositeHashes);
				return db.metadatasByCompositeHash(compositeHashes)
					.then(result => {
						console.log('result');
						console.log(result);
						routeUtils.createSender('content').sendPlainText(res, next)(result);
					});
			} catch (e) {
				res.send(errors.createInternalError('error retrieving data'));
			}
		});
	}
};
