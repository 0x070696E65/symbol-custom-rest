const bs58 = require('bs58');

const Nibble_To_Char_Map = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
const METAL_ID_HEADER_HEX = '0B2A';

const metal = {
	uint8ToHex(input) {
		let s = '';
		// eslint-disable-next-line no-restricted-syntax
		for (const byte of input) {
			s += Nibble_To_Char_Map[byte >> 4];
			s += Nibble_To_Char_Map[byte & 0x0f];
		}
		return s;
	},

	restoreMetadataHash(metalId) {
		const hashHex = this.uint8ToHex(bs58.decode(metalId));
		if (!hashHex.startsWith(METAL_ID_HEADER_HEX))
			throw Error('Invalid metal ID.');

		return hashHex.slice(METAL_ID_HEADER_HEX.length);
	},
	metadatasByCompositeHash(ids, db) {
		const compositeHashes = ids.map(id => Buffer.from(id));
		const conditions = { 'metadataEntry.compositeHash': { $in: compositeHashes } };
		const collection = db.database.collection('metadata');
		return collection.find(conditions)
			.sort({ _id: -1 })
			.toArray()
			.then(entities => Promise.resolve(db.sanitizer.renameIds(entities)));
	},
	async getFirstChunk(metalId, db) {
		this.metadatasByCompositeHash(this.restoreMetadataHash(metalId), db);
	}
};

module.exports = metal;
