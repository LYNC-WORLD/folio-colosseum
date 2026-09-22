import { VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";

export async function fetchData(): Promise<void> {
  try {
    const response = await fetch(
      "https://api.jup.ag/swap/v2/order?inputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputMint=Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu&amount=10000000&taker=EgfxC1y5pBpi4fxKEbBDYn9eyAxdZq4yr2qbgLMpbgXQ",
      {
        method: "GET",
        headers: {
          "x-api-key":
            "REDACTED_JUPITER_API_KEY",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    console.log("Response:", data);
    const transaction = VersionedTransaction.deserialize(
      Buffer.from(data.transaction, "base64"),
    );

    console.log("transaction: ", transaction);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Call the function
fetchData();
