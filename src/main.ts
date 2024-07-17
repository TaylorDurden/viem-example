import {
  createPublicClient,
  http,
  fromHex,
  formatUnits,
  Abi,
  AbiEvent,
  decodeEventLog,
} from "viem";
import { mainnet } from "viem/chains";

const USDC_CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const MAINNET_RPC_URL = import.meta.env.VITE_MAINNET_RPC_URL;
console.log("MAINNET_RPC_URL: ", MAINNET_RPC_URL);

interface TransferEvent {
  from?: string;
  to?: string;
  value?: string;
  transactionHash: string;
}

interface DecodedEventLog {
  args?: {
    from?: string;
    to?: string;
    value?: string;
  };
}

const client = createPublicClient({
  chain: mainnet,
  transport: http(MAINNET_RPC_URL),
});

async function fetchRecentUSDCTransfers(): Promise<TransferEvent[]> {
  const latestBlockNumber = await client.getBlockNumber();
  const startBlockNumber = latestBlockNumber - 100n;
  console.log(`startBlockNumber: ${startBlockNumber}`);
  console.log(`latestBlockNumber: ${latestBlockNumber}`);
  const transferEvent: AbiEvent = {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  };
  const abi: Abi = [transferEvent];
  const logs = await client.getLogs({
    address: USDC_CONTRACT_ADDRESS,
    event: transferEvent,
    fromBlock: startBlockNumber,
    toBlock: latestBlockNumber,
  });

  return logs.map((log) => {
    const decodedLog = decodeEventLog({
      abi: abi,
      data: log.data,
      topics: log.topics,
    }) as DecodedEventLog;
    console.log("decodedLog:", decodedLog);
    const transferEvent: TransferEvent = {
      from: decodedLog.args?.from,
      to: decodedLog.args?.to,
      value: formatUnits(fromHex(log.data, "bigint"), 6).toString(),
      transactionHash: log.transactionHash,
    };
    return transferEvent;
  });
}

async function main() {
  const transfers = await fetchRecentUSDCTransfers();

  let htmlContent = `
  
    <h1>Recent USDC Transfers</h1>
    <table>
      <tr>
        <th>From</th>
        <th>To</th>
        <th>Amount (USDC)</th>
        <th>Transaction ID</th>
      </tr>`;

  transfers.forEach((transfer) => {
    htmlContent += `
      <tr>
        <td>${transfer.from}</td>
        <td>${transfer.to}</td>
        <td>${transfer.value}</td>
        <td>${transfer.transactionHash}</td>
      </tr>`;
  });

  htmlContent += `
    </table>`;
  document.getElementById("app")!.innerHTML = htmlContent;
}

main().catch((error) => {
  console.error("Error fetching USDC transfers:", error);
});
