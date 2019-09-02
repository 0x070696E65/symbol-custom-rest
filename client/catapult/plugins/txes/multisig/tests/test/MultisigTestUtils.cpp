/**
*** Copyright (c) 2016-present,
*** Jaguar0625, gimre, BloodyRookie, Tech Bureau, Corp. All rights reserved.
***
*** This file is part of Catapult.
***
*** Catapult is free software: you can redistribute it and/or modify
*** it under the terms of the GNU Lesser General Public License as published by
*** the Free Software Foundation, either version 3 of the License, or
*** (at your option) any later version.
***
*** Catapult is distributed in the hope that it will be useful,
*** but WITHOUT ANY WARRANTY; without even the implied warranty of
*** MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
*** GNU Lesser General Public License for more details.
***
*** You should have received a copy of the GNU Lesser General Public License
*** along with Catapult. If not, see <http://www.gnu.org/licenses/>.
**/

#include "MultisigTestUtils.h"
#include "src/cache/MultisigCache.h"
#include "catapult/cache/CatapultCacheDelta.h"
#include "catapult/utils/MemoryUtils.h"
#include "tests/test/nodeps/Random.h"

namespace catapult { namespace test {

	std::vector<Key> GenerateKeys(size_t count) {
		return test::GenerateRandomDataVector<Key>(count);
	}

	std::vector<model::Cosignature> GenerateCosignaturesFromCosignatories(const std::vector<Key>& cosignatories) {
		auto cosignatures = test::GenerateRandomDataVector<model::Cosignature>(cosignatories.size());
		for (auto i = 0u; i < cosignatories.size(); ++i)
			cosignatures[i].SignerPublicKey = cosignatories[i];

		return cosignatures;
	}

	std::unique_ptr<model::EmbeddedMultisigAccountModificationTransaction> CreateMultisigAccountModificationTransaction(
			const Key& signer,
			const std::vector<model::CosignatoryModificationAction>& modificationActions) {
		using TransactionType = model::EmbeddedMultisigAccountModificationTransaction;
		auto numModifications = static_cast<uint8_t>(modificationActions.size());
		uint32_t entitySize = sizeof(TransactionType) + numModifications * sizeof(model::CosignatoryModification);
		auto pTransaction = utils::MakeUniqueWithSize<TransactionType>(entitySize);
		pTransaction->Size = entitySize;
		pTransaction->ModificationsCount = numModifications;
		pTransaction->Type = model::Entity_Type_Multisig_Account_Modification;
		pTransaction->SignerPublicKey = signer;

		auto* pModification = pTransaction->ModificationsPtr();
		for (auto i = 0u; i < numModifications; ++i) {
			pModification->ModificationAction = modificationActions[i];
			test::FillWithRandomData(pModification->CosignatoryPublicKey);
			++pModification;
		}

		return pTransaction;
	}

	namespace {
		state::MultisigEntry& GetOrCreateEntry(cache::MultisigCacheDelta& multisigCache, const Key& key) {
			if (!multisigCache.contains(key))
				multisigCache.insert(state::MultisigEntry(key));

			return multisigCache.find(key).get();
		}
	}

	void MakeMultisig(
			cache::CatapultCacheDelta& cache,
			const Key& multisigKey,
			const std::vector<Key>& cosignatoryKeys,
			uint8_t minApproval,
			uint8_t minRemoval) {
		auto& multisigCache = cache.sub<cache::MultisigCache>();

		auto& multisigEntry = GetOrCreateEntry(multisigCache, multisigKey);
		multisigEntry.setMinApproval(minApproval);
		multisigEntry.setMinRemoval(minRemoval);

		// add all cosignatories
		for (const auto& cosignatoryKey : cosignatoryKeys) {
			multisigEntry.cosignatoryPublicKeys().insert(cosignatoryKey);

			auto& cosignatoryEntry = GetOrCreateEntry(multisigCache, cosignatoryKey);
			cosignatoryEntry.multisigPublicKeys().insert(multisigKey);
		}
	}

	namespace {
		void AssertEqual(const utils::SortedKeySet& expectedAccountKeys, const utils::SortedKeySet& accountKeys) {
			ASSERT_EQ(expectedAccountKeys.size(), accountKeys.size());
			EXPECT_EQ(expectedAccountKeys, accountKeys);
		}
	}

	void AssertEqual(const state::MultisigEntry& expectedEntry, const state::MultisigEntry& entry) {
		EXPECT_EQ(expectedEntry.minApproval(), entry.minApproval());
		EXPECT_EQ(expectedEntry.minRemoval(), entry.minRemoval());

		EXPECT_EQ(expectedEntry.key(), entry.key());

		AssertEqual(expectedEntry.cosignatoryPublicKeys(), entry.cosignatoryPublicKeys());
		AssertEqual(expectedEntry.multisigPublicKeys(), entry.multisigPublicKeys());
	}
}}
