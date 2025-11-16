import { depositUnifiedUSDC } from "./gateway";

async function main() {
  await depositUnifiedUSDC({
    privateKey:
      "0x642c3c4d408894cdc8a1976dbb0d0bab5fc32244bc391e5ed42c3dd7852aa251",
    chain: "arcTestnet", // ← use Arc as main chain
    usdcAddress: "0x3600000000000000000000000000000000000000" as `0x${string}`,
    gatewayAddress:
      "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as `0x${string}`,
    depositAmount: 5_000000n, // 10 USDC
  });
}

main();
