const { buildOffsetCondition } = require('../../db/dbUtils');
const MongoDb = require('mongodb');

const { Long } = MongoDb;

class ContentDb {
    constructor(db) {
        this.catapultDb = db;
    }

	mosaics(ownerAddress, options) {
		const sortingOptions = { id: '_id' };

		let conditions = {};

		const offsetCondition = buildOffsetCondition(options, sortingOptions);
		if (offsetCondition)
			conditions = Object.assign(conditions, offsetCondition);

		if (undefined !== ownerAddress)
			conditions['mosaic.ownerAddress'] = Buffer.from(ownerAddress);

		const sortConditions = { [sortingOptions[options.sortField]]: options.sortDirection };
		return this.catapultDb.queryPagedDocuments(conditions, [], sortConditions, 'mosaics', options);
	}

	/**
	 * Retrieves mosaics given their ids.
	 * @param {Array.<module:catapult.utils/uint64~uint64>} ids Mosaic ids.
	 * @returns {Promise.<array>} Mosaics.
	 */
	mosaicsByIds(ids) {
		const mosaicIds = ids;
		const conditions = { 'mosaic.id': { $in: mosaicIds } };
		const collection = this.catapultDb.database.collection('mosaics');
		console.log(conditions);
		return collection.find(conditions)
			.sort({ _id: -1 })
			.toArray()
			.then(entities => Promise.resolve(this.catapultDb.sanitizer.renameIds(entities)));
	}
}

module.exports = ContentDb;