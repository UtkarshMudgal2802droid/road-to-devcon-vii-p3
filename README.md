# ENS Agent Router - Devcon 7 Problem 3

A front-door router that routes incoming questions to the correct specialist AI agent using ENS records.

## Architecture & Record Format

The router discovers agents by looking up a text record on the root domain (`priyadesign.eth`). 
- **Root Domain:** `priyadesign.eth`
  - Text record `agents.list` contains a comma-separated list of agent subnames.

For each agent in the list (e.g. `invoice.priyadesign.eth`), the router reads:
- Text record `agent.description`: What the agent does.
- Text record `agent.url`: The URL endpoint to send the POST request to.

## Our Published Agents on Sepolia

1. **`invoice.priyadesign.eth`**
   - `agent.description`: "Sorts out invoices"
   - `agent.url`: `https://invoice-helper.app/api/agents/invoice`
2. **`copy.priyadesign.eth`**
   - `agent.description`: "Writes brand copy"
   - `agent.url`: `https://copy-helper.app/api/agents/copy`
3. **`contract.priyadesign.eth`**
   - `agent.description`: "Answers contract questions"
   - `agent.url`: `https://contract-helper.app/api/agents/contract`

## Local Testing
To start the router locally with the built-in mock agents:
```bash
pnpm install
pnpm run dev
```
