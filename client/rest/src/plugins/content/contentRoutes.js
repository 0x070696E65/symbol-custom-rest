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

class MetadataEntry {
	constructor(version, compositeHash, sourceAddress, targetAddress, scopedMetadataKey, targetId, metadataType, valueSize, value) {
		this.version = version;
		this.compositeHash = compositeHash;
		this.sourceAddress = sourceAddress;
		this.targetAddress = targetAddress;
		this.scopedMetadataKey = scopedMetadataKey;
		this.targetId = targetId;
		this.metadataType = metadataType;
		this.valueSize = valueSize;
		this.value = value;
	}
}

const desirializeMetadata = v => ({
	magic: v.substring(0, 1),
	version: v.substring(1, 4),
	additive: v.substring(4, 8),
	scopedMetadataKey: v.substring(8, 24),
	value: v.substring(24)
});

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
				const getMetadata = (metadataEntry, scopedMetadataKey, options) => db.metadata(
					metadataEntry.sourceAddress,
					metadataEntry.targetAddress,
					scopedMetadataKey,
					metadataEntry.targetId,
					metadataEntry.metadataType,
					options
				).then(r => {
					console.log(`rrr: ${r.data}`);
					return r.data;
				});

				const fetch = async (metadataEntry, firstscopedMetadataKey) => {
					const options = {
						sortField: 'id', sortDirection: 1, pageSize: 1000, pageNumber: 1
					};
					let s = firstscopedMetadataKey;
					console.log(s);
					let base64 = '';
					let m = '';
					do {
						// eslint-disable-next-line no-await-in-loop
						const d = await getMetadata(metadataEntry, s, options);
						console.log(`rrr: ${d}`);
						console.log(d[0].metadataEntry.value);
						console.log(d[0].metadataEntry.value.buffer.toString());
						const {
							magic, scopedMetadataKey, value
						} = desirializeMetadata(d[0].metadataEntry.value.buffer.toString());
						m = magic;
						s = convertToLong(scopedMetadataKey);
						base64 += value;
					} while ('E' !== m);
					return base64;
				};
				const { metalId } = req.params;
				const compositeHash = {
					compositeHash: metal.restoreMetadataHash(metalId)
				};
				const compositeHashes = [routeUtils.parseArgument(compositeHash, 'compositeHash', 'hash256')];
				return db.metadatasByCompositeHash(compositeHashes)
					.then(async result => {
						console.log(result[0].metadataEntry.value);
						const metadataEntry = new MetadataEntry(
							result[0].metadataEntry.version,
							result[0].metadataEntry.compositeHash,
							result[0].metadataEntry.sourceAddress,
							result[0].metadataEntry.targetAddress,
							result[0].metadataEntry.scopedMetadataKey,
							result[0].metadataEntry.targetId,
							result[0].metadataEntry.metadataType,
							result[0].metadataEntry.valueSize,
							result[0].metadataEntry.value
						);
						const base64 = await fetch(metadataEntry, metadataEntry.scopedMetadataKey);
						routeUtils.createSender('content').sendPlainText(res, next)(base64);
					});
			} catch (e) {
				res.send(errors.createInternalError('error retrieving data'));
			}
		});
	}
};
