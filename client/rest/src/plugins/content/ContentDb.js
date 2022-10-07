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
		conditions['metadataEntry.metadataType'] = 1;//mosaic
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

	transactionsByHashes(hashes){
		return this.catapultDb.transactionsByHashes("confirmed", hashes);
	}
}

module.exports = ContentDb;