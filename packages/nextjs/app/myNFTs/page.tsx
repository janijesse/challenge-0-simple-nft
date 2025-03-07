"use client";

import type { NextPage } from "next";
import { useAccount } from "@starknet-react/core";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";
import { MyHoldings } from "~~/components/SimpleNFT/MyHoldings";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { notification } from "~~/utils/scaffold-stark";
import { addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import nftsMetadata from "~~/utils/simpleNFT/nftsMetadata";
import { useState } from "react";

const MyNFTs: NextPage = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [status, setStatus] = useState("Mint NFT");
  const [isMinting, setIsMinting] = useState(false);
  const [lastMintedTokenId, setLastMintedTokenId] = useState<number>();

  const { sendAsync: mintItem } = useScaffoldWriteContract({
    contractName: "YourCollectible",
    functionName: "mint_item",
    args: [connectedAddress, ""],
  });

  const { data: tokenIdCounter, refetch } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "current",
    watch: true,
  });

  const handleMintItem = async () => {
    setStatus("Minting NFT");
    setIsMinting(true);
    const tokenIdCounterNumber = Number(tokenIdCounter);

    // circle back to the zero item if we've reached the end of the array
    if (
      tokenIdCounter === undefined ||
      tokenIdCounterNumber === lastMintedTokenId
    ) {
      setStatus("Mint NFT");
      setIsMinting(false);
      notification.warning(
        "Cannot mint the same token again, please wait for the new token ID",
      );
      return;
    }

    const currentTokenMetaData =
      nftsMetadata[tokenIdCounterNumber % nftsMetadata.length];
    const notificationId = notification.loading("Uploading to IPFS");
    try {
      const uploadedItem = await addToIPFS(currentTokenMetaData);

      // First remove previous loading notification and then show success notification
      notification.remove(notificationId);
      notification.success("Metadata uploaded to IPFS");

      await mintItem({
        args: [connectedAddress, uploadedItem.path],
      });
      setStatus("Updating NFT List");
      refetch();
      setLastMintedTokenId(tokenIdCounterNumber);
      setIsMinting(false);
    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
      setStatus("Mint NFT");
      setIsMinting(false);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">My NFTs</span>
          </h1>
        </div>
      </div>
      <div className="flex justify-center">
        {!isConnected || isConnecting ? (
          <CustomConnectButton />
        ) : (
          <button
            className="btn btn-secondary text-white"
            disabled={status !== "Mint NFT" || isMinting}
            onClick={handleMintItem}
          >
            {status !== "Mint NFT" && (
              <span className="loading loading-spinner loading-xs"></span>
            )}
            {status}
          </button>
        )}
      </div>
      <MyHoldings setStatus={setStatus} />
    </>
  );
};

export default MyNFTs;
