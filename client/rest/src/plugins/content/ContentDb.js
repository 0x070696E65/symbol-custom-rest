const { buildOffsetCondition } = require('../../db/dbUtils');
const { convertToLong } = require('../../db/dbUtils');
const MongoDb = require('mongodb');

const { Long } = MongoDb;

class ContentDb {
	constructor(db) {
		this.catapultDb = db;
	}

	metadataEntry(targetId, metadataType, options) {
		const sortingOptions = { id: '_id' };

		let conditions = {};
		conditions['metadataEntry.targetId'] = convertToLong(targetId);
		conditions['metadataEntry.metadataType'] = 1;// mosaic
		const offsetCondition = buildOffsetCondition(options, sortingOptions);
		if (offsetCondition)
			conditions = Object.assign(conditions, offsetCondition);

		if (undefined !== targetId)
			conditions['metadataEntry.targetId'] = convertToLong(targetId);

		if (undefined !== metadataType)
			conditions['metadataEntry.metadataType'] = metadataType;

		const sortConditions = { [sortingOptions[options.sortField]]: options.sortDirection };
		return this.catapultDb.queryPagedDocuments(conditions, [], sortConditions, 'metadata', options);
	}

	metadata(sourceAddress, targetAddress, scopedMetadataKey, targetId, metadataType, options) {
		const sortingOptions = { id: '_id' };

		let conditions = {};

		const offsetCondition = buildOffsetCondition(options, sortingOptions);
		if (offsetCondition)
			conditions = Object.assign(conditions, offsetCondition);

		if (undefined !== sourceAddress)
			conditions['metadataEntry.sourceAddress'] = sourceAddress;

		if (undefined !== targetAddress)
			conditions['metadataEntry.targetAddress'] = targetAddress;

		if (undefined !== scopedMetadataKey)
			conditions['metadataEntry.scopedMetadataKey'] = scopedMetadataKey;

		if (undefined !== targetId)
			conditions['metadataEntry.targetId'] = targetId;

		if (undefined !== metadataType)
			conditions['metadataEntry.metadataType'] = metadataType;

		const sortConditions = { [sortingOptions[options.sortField]]: options.sortDirection };
		return this.catapultDb.queryPagedDocuments(conditions, [], sortConditions, 'metadata', options);
	}

	transactionsByHashes(hashes) {
		return this.catapultDb.transactionsByHashes('confirmed', hashes);
	}

	metadatasByCompositeHash(ids) {
		const compositeHashes = ids.map(id => Buffer.from(id));
		const conditions = { 'metadataEntry.compositeHash': { $in: compositeHashes } };
		const collection = this.catapultDb.database.collection('metadata');
		return collection.find(conditions)
			.sort({ _id: -1 })
			.toArray()
			.then(entities => Promise.resolve(this.catapultDb.sanitizer.renameIds(entities)));
	}

	transactions(group, filters, options) {
		return this.catapultDb.transactions(group, filters, options);
	}
}

module.exports = ContentDb;
