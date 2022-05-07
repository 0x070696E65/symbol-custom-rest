import "transaction.cats"

# Test PluginTransaction(copy of transfer)
# Shared content between RevokeTransferTransaction and EmbeddedRevokeTransferTransaction.
inline struct RevokeTransferTransactionBody
	# recipient address
	recipient_address = UnresolvedAddress

	# size of attached message
	message_size = uint16

	# number of attached mosaics
	mosaics_count = uint8

	# reserved padding to align mosaics on 8-byte boundary
	revoketransfer_transaction_body_reserved_1 = make_reserved(uint8, 0)

	# reserved padding to align mosaics on 8-byte boundary
	revoketransfer_transaction_body_reserved_2 = make_reserved(uint32, 0)

	# attached mosaics
	@sort_key(mosaic_id)
	mosaics = array(UnresolvedMosaic, mosaics_count)

	# attached message
	message = array(uint8, message_size)

# Send mosaics and messages between two accounts.
struct RevokeTransferTransaction
	TRANSACTION_VERSION = make_const(uint8, 1)
	TRANSACTION_TYPE = make_const(TransactionType, REVOKETRANSFER)

	inline Transaction
	inline RevokeTransferTransactionBody

# Embedded version of RevokeTransferTransaction.
struct EmbeddedRevokeTransferTransaction
	TRANSACTION_VERSION = make_const(uint8, 1)
	TRANSACTION_TYPE = make_const(TransactionType, REVOKETRANSFER)

	inline EmbeddedTransaction
	inline RevokeTransferTransactionBody
