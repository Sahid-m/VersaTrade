import { createPublicClient, erc20Abi, getContract, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as chains from "viem/chains";

export type DepositParams = {
  privateKey: string;
  chain: keyof typeof chains; // e.g. "sepolia", "arbitrumSepolia", "arcTestnet"
  usdcAddress: `0x${string}`;
  gatewayAddress: `0x${string}`;
  depositAmount: bigint; // amount in USDC base units
};

/**
 * Creates a unified USDC balance by:
 * 1. Approving Gateway Wallet to spend USDC
 * 2. Depositing into Circle Gateway
 * 3. Waiting for confirmations
 */
export async function depositUnifiedUSDC(params: DepositParams) {
  const { privateKey, chain, usdcAddress, gatewayAddress, depositAmount } =
    params;

  // Convert private key to account
  const account = privateKeyToAccount(privateKey);

  // Create RPC client
  const client = createPublicClient({
    chain: chains[chain],
    account,
    transport: http(),
  });

  // Gateway Wallet ABI (deposit only)
  const gatewayWalletAbi = [
    {
      type: "function",
      name: "deposit",
      inputs: [
        { name: "token", type: "address" },
        { name: "value", type: "uint256" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
  ];

  // Load contracts
  const usdc = getContract({
    address: usdcAddress,
    abi: erc20Abi,
    client,
  });

  const gateway = getContract({
    address: gatewayAddress,
    abi: gatewayWalletAbi,
    client,
  });

  console.log(`\n📌 Approving Gateway to spend ${depositAmount} USDC...`);

  // Step 1 — Approve
  const approvalTx = await usdc.write.approve([gatewayAddress, depositAmount]);

  await client.waitForTransactionReceipt({ hash: approvalTx });
  console.log(`✅ Approval confirmed: ${approvalTx}`);

  // Step 2 — Deposit
  console.log(`\n📌 Depositing USDC into Circle Gateway...`);

  const depositTx = await gateway.write.deposit([usdcAddress, depositAmount]);

  await client.waitForTransactionReceipt({ hash: depositTx });
  console.log(`✅ Deposit confirmed: ${depositTx}`);

  return depositTx;
}
