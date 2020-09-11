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

#include "finalization/src/chain/FinalizationProofSynchronizer.h"
#include "finalization/src/io/ProofStorageCache.h"
#include "catapult/io/BlockStorageCache.h"
#include "finalization/tests/test/FinalizationMessageTestUtils.h"
#include "finalization/tests/test/mocks/MockProofApi.h"
#include "finalization/tests/test/mocks/MockProofStorage.h"
#include "tests/test/core/mocks/MockMemoryBlockStorage.h"
#include "tests/TestHarness.h"

namespace catapult { namespace chain {

#define TEST_CLASS FinalizationProofSynchronizerTests

	namespace {
		// region TestContext

		class TestContext {
		public:
			TestContext(uint64_t votingSetGrouping, Height localChainHeight, Height localFinalizedHeight)
					: m_pBlockStorageCache(mocks::CreateMemoryBlockStorageCache(static_cast<uint32_t>(localChainHeight.unwrap())))
					, m_pProofStorage(std::make_unique<mocks::MockProofStorage>(FinalizationPoint(11), localFinalizedHeight))
					, m_pProofStorageRaw(m_pProofStorage.get())
					, m_proofStorageCache(std::move(m_pProofStorage))
					, m_synchronizer(CreateFinalizationProofSynchronizer(
							votingSetGrouping,
							*m_pBlockStorageCache,
							m_proofStorageCache,
							[this](const auto&) {
								++m_numValidationCalls;
								return m_validationResult;
							}))
					, m_numValidationCalls(0)
					, m_validationResult(true)
			{}

		public:
			auto& api() {
				return m_proofApi;
			}

			auto& storage() {
				return *m_pProofStorageRaw;
			}

			auto numValidationCalls() {
				return m_numValidationCalls;
			}

		public:
			void setValidationFailure() {
				m_validationResult = false;
			}

		public:
			auto synchronize() {
				return m_synchronizer(m_proofApi).get();
			}

		private:
			std::unique_ptr<io::BlockStorageCache> m_pBlockStorageCache;

			std::unique_ptr<mocks::MockProofStorage> m_pProofStorage; // moved into m_proofStorageCache
			mocks::MockProofStorage* m_pProofStorageRaw;
			io::ProofStorageCache m_proofStorageCache;

			RemoteNodeSynchronizer<api::RemoteProofApi> m_synchronizer;

			mocks::MockProofApi m_proofApi;
			size_t m_numValidationCalls;
			bool m_validationResult;
		};

		// endregion
	}

	// region bypass - proof already pulled

	namespace {
		void AssertApiIsBypassed(Height localChainHeight) {
			// Arrange:
			TestContext context(20, localChainHeight, Height(81));

			// Act:
			auto result = context.synchronize();

			// Assert:
			EXPECT_EQ(ionet::NodeInteractionResultCode::Neutral, result);

			EXPECT_TRUE(context.api().proofHeights().empty());
			EXPECT_EQ(0u, context.numValidationCalls());
			EXPECT_TRUE(context.storage().savedProofDescriptors().empty());
		}
	}

	TEST(TEST_CLASS, NeutralWhenNextProofHeightIsGreaterThanLocalChainHeight) {
		AssertApiIsBypassed(Height(35));
		AssertApiIsBypassed(Height(70));
		AssertApiIsBypassed(Height(99));
	}

	TEST(TEST_CLASS, NeutralWhenNextProofHeightIsEqualToLocalChainHeight) {
		AssertApiIsBypassed(Height(100));
	}

	// endregion

	// region api errors + short circuit

	namespace {
		model::FinalizationStatistics CreateFinalizationStatistics(Height height) {
			return { { FinalizationEpoch(3), FinalizationPoint(12) }, height, Hash256() };
		}
	}

	TEST(TEST_CLASS, FailureWhenFinalizationStatisticsFails) {
		// Arrange:
		TestContext context(20, Height(101), Height(81));
		context.api().setError(mocks::MockProofApi::EntryPoint::Finalization_Statistics);

		// Act:
		auto result = context.synchronize();

		// Assert:
		EXPECT_EQ(ionet::NodeInteractionResultCode::Failure, result);

		EXPECT_TRUE(context.api().proofHeights().empty());
		EXPECT_EQ(0u, context.numValidationCalls());
		EXPECT_TRUE(context.storage().savedProofDescriptors().empty());
	}

	TEST(TEST_CLASS, NeutralWhenFinalizationStatisticsReturnsHeightLessThanNextProofHeight) {
		// Arrange:
		TestContext context(20, Height(101), Height(81));
		context.api().setFinalizationStatistics(CreateFinalizationStatistics(Height(99)));

		// Act:
		auto result = context.synchronize();

		// Assert:
		EXPECT_EQ(ionet::NodeInteractionResultCode::Neutral, result);

		EXPECT_TRUE(context.api().proofHeights().empty());
		EXPECT_EQ(0u, context.numValidationCalls());
		EXPECT_TRUE(context.storage().savedProofDescriptors().empty());
	}

	TEST(TEST_CLASS, FailureWhenProofAtFails) {
		// Arrange:
		TestContext context(20, Height(101), Height(81));
		context.api().setFinalizationStatistics(CreateFinalizationStatistics(Height(100)));
		context.api().setError(mocks::MockProofApi::EntryPoint::Proof_At_Height);

		// Act:
		auto result = context.synchronize();

		// Assert:
		EXPECT_EQ(ionet::NodeInteractionResultCode::Failure, result);

		EXPECT_EQ(std::vector<Height>({ Height(100) }), context.api().proofHeights());
		EXPECT_EQ(0u, context.numValidationCalls());
		EXPECT_TRUE(context.storage().savedProofDescriptors().empty());
	}

	// endregion

	// region proof validation failures

	TEST(TEST_CLASS, FailureWhenRemoteProofHeightDoesNotMatchRequestedProofHeight) {
		// Arrange:
		TestContext context(20, Height(101), Height(81));
		context.api().setFinalizationStatistics(CreateFinalizationStatistics(Height(100)));

		// - height is off by one
		auto pProof = std::make_shared<model::FinalizationProof>();
		pProof->Round = { FinalizationEpoch(22), FinalizationPoint(111) };
		pProof->Height = Height(101);
		pProof->Hash = Hash256{ { 33 } };
		context.api().setProof(pProof);

		// Act:
		auto result = context.synchronize();

		// Assert:
		EXPECT_EQ(ionet::NodeInteractionResultCode::Failure, result);

		EXPECT_EQ(std::vector<Height>({ Height(100) }), context.api().proofHeights());
		EXPECT_EQ(0u, context.numValidationCalls());
		EXPECT_TRUE(context.storage().savedProofDescriptors().empty());
	}

	TEST(TEST_CLASS, FailureWhenRemoteProofFailsValidation) {
		// Arrange:
		TestContext context(20, Height(101), Height(81));
		context.api().setFinalizationStatistics(CreateFinalizationStatistics(Height(100)));
		context.setValidationFailure();

		auto pProof = std::make_shared<model::FinalizationProof>();
		pProof->Round = { FinalizationEpoch(22), FinalizationPoint(111) };
		pProof->Height = Height(100);
		pProof->Hash = Hash256{ { 33 } };
		context.api().setProof(pProof);

		// Act:
		auto result = context.synchronize();

		// Assert:
		EXPECT_EQ(ionet::NodeInteractionResultCode::Failure, result);

		EXPECT_EQ(std::vector<Height>({ Height(100) }), context.api().proofHeights());
		EXPECT_EQ(1u, context.numValidationCalls());
		EXPECT_TRUE(context.storage().savedProofDescriptors().empty());
	}

	// endregion

	// region success

	namespace {
		void AssertSuccess(TestContext& context, Height proofHeight) {
			// Arrange:
			auto pProof = std::make_shared<model::FinalizationProof>();
			pProof->Round = { FinalizationEpoch(22), FinalizationPoint(111) };
			pProof->Height = proofHeight;
			pProof->Hash = Hash256{ { 33 } };
			context.api().setProof(pProof);

			// Act:
			auto result = context.synchronize();

			// Assert:
			EXPECT_EQ(ionet::NodeInteractionResultCode::Success, result);

			EXPECT_EQ(std::vector<Height>({ proofHeight }), context.api().proofHeights());
			EXPECT_EQ(1u, context.numValidationCalls());

			ASSERT_EQ(1u, context.storage().savedProofDescriptors().size());
			const auto& savedProofDescriptor = context.storage().savedProofDescriptors()[0];
			EXPECT_EQ(test::CreateFinalizationRound(22, 111), savedProofDescriptor.Round);
			EXPECT_EQ(proofHeight, savedProofDescriptor.Height);
			EXPECT_EQ(Hash256{ { 33 } }, savedProofDescriptor.Hash);
		}

		void AssertSuccess(Height localChainHeight, uint64_t remoteHeightDelta) {
			// Arrange:
			TestContext context(20, localChainHeight, Height(81));
			context.api().setFinalizationStatistics(CreateFinalizationStatistics(Height(100 + remoteHeightDelta)));

			// Act + Assert:
			AssertSuccess(context, Height(100));
		}
	}

	TEST(TEST_CLASS, SuccessWhenRemoteFinalizationStatisticsReturnsHeightEqualToExpectedProofHeight) {
		AssertSuccess(Height(101), 0);
	}

	TEST(TEST_CLASS, SuccessWhenRemoteFinalizationStatisticsReturnsHeightGreaterThanExpectedProofHeight) {
		AssertSuccess(Height(101), 100);
	}

	TEST(TEST_CLASS, SuccessWhenLocalChainHeightIsMultipleVotingSetsAheadOfLocalFinalizedHeight) {
		// Assert: proofs aren't skipped
		AssertSuccess(Height(201), 100);
	}

	namespace {
		void AssertSuccessNext(Height localChainHeight, Height localFinalizedHeight, Height expectedProofHeight) {
			// Arrange:
			TestContext context(20, localChainHeight, localFinalizedHeight);
			context.api().setFinalizationStatistics(CreateFinalizationStatistics(expectedProofHeight));

			// Act + Assert:
			AssertSuccess(context, expectedProofHeight);
		}
	}

	TEST(TEST_CLASS, SuccessWhenRequestingNextProof_FromNemesisEpoch) {
		AssertSuccessNext(Height(21), Height(1), Height(20));
	}

	TEST(TEST_CLASS, SuccessWhenRequestingNextProof_FromOtherEpoch) {
		AssertSuccessNext(Height(41), Height(20), Height(40));
	}

	// endregion
}}