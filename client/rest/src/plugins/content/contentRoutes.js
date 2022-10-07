const routeUtils = require('../../routes/routeUtils');
const { convertToLong } = require('../../db/dbUtils');
const catapult = require('../../catapult-sdk');
const { uint64 } = catapult.utils;
const errors = require('../../server/errors');

const is_tx = data => {
	try {
		let res = JSON.parse(data.buffer.toString());
		if(Array.isArray(res))return res.map(value=>{return routeUtils.namedParserMap.hash256(value)});
		else return undefined
	} catch (error) {
		return undefined
	}
}

const numCompare = (a, b) => {
	const numA = Number(a.split('#', 2)[0]);
	const numB = Number(b.split('#', 2)[0]);

	let comparison = 0;
	if (numA > numB) {
		comparison = 1;
	} else if (numA < numB) {
		comparison = -1;
	}
	return comparison;
}
module.exports = {
    register: (server, db, services) => {

		server.get('/content/comsa/:mosaicId', (req, res, next) => {
			try{
				const targetId = convertToLong(routeUtils.parseArgument(req.params, 'mosaicId', uint64.fromHex));
				const metadataType = 1;
				const options = { sortField: 'id', sortDirection: 1, pageSize: 1000, pageNumber: 1 };
				return db.metadataEntry(targetId, metadataType, options)
					.then(result => {
						const meta = result.data;
						const hashes = [];
						const payload = [];
						let mime = "";
						meta.forEach(m=>{
							const res = is_tx(m.metadataEntry.value);
							if(res!==undefined)hashes.push(...res);
						});
						// txを全てデコードする
						db.transactionsByHashes(hashes)
							.then(txs=>{
								txs.forEach(agg=>{
									if(!(agg.transaction.transactions.length > 1 &&
										agg.transaction.transactions[1].transaction.message?.buffer.slice(1,).toString().match(/^00000#/) != null &&
										agg.transaction.transactions.length < 99 )){
											if(mime=="")mime = JSON.parse(agg.transaction.transactions[0].transaction.message?.buffer.slice(1,).toString()).mime_type;
											agg.transaction.transactions.slice(1,).forEach(itx=>{
											payload.push(itx.transaction.message.buffer.slice(1,).toString());
										})
									}
								})
								routeUtils.createSender('content').sendContent(res, next)(
									Buffer.from(payload.filter(v => v).sort(numCompare).map((r) => r.split('#', 2)[1]).join(), "base64"),
									mime
									);
							});
							});
			}catch(e){
				res.send(errors.createInternalError('error retrieving data'));
			}
			next();
		}
	)}
};