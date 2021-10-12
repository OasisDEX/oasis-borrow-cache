
import { BigNumber } from "bignumber.js";
import { Event } from "./history";

export type Aggregated<T> = T & {
	beforeDebt: BigNumber,
	debt: BigNumber,
	beforeLockedCollateral: BigNumber,
	lockedCollateral: BigNumber,
  
	// liquidationPrice: BigNumber
	// beforeCollateralizationRatio: BigNumber
	// collateralizationRatio: BigNumber
  }
  

const allowedStandardEvents = ['DEPOSIT', 'DEPOSIT-GENERATE', 'WITHDRAW', 'WITHDRAW-PAYBACK'] as const
export type AllowedEventsKey = (typeof allowedStandardEvents)[number]
export type FilterByKind<E extends {kind: string}, K extends string> = E extends any ? E["kind"] extends K ? E : never : never
export type FrobEvents = FilterByKind<Aggregated<Event>, AllowedEventsKey>

export function isFrobEvent(event: Aggregated<Event>): event is FrobEvents {
	return allowedStandardEvents.includes(event.kind as any)
}

export function assertAllowedEvent(event: Aggregated<Event>): asserts event is FrobEvents {
  if (!allowedStandardEvents.includes(event.kind as any)) {
    throw new Error(`${event.kind} event cannot be combined with multiplyEvent`)
  }
}

export interface CommonEvent {
	marketPrice: BigNumber
	oraclePrice: BigNumber

	beforeDebt: BigNumber
    debt: BigNumber

	beforeCollateral: BigNumber
	collateral: BigNumber

	beforeCollateralizationRatio: BigNumber
    collateralizationRatio: BigNumber

	
	multiple: BigNumber
	beforeMultiple: BigNumber

	urn: string
	log_index: number,
	tx_id: number,
	block_id: number,

	netValue: BigNumber

	liquidationRatio: BigNumber,
	beforeLiquidationPrice: BigNumber
	liquidationPrice: BigNumber

	loanFee: BigNumber
	oazoFee: BigNumber
    totalFee: BigNumber
	gasFee: BigNumber // in wei
}


interface OpenMultiplyEvent extends CommonEvent {
    kind: 'OPEN_MULTIPLY_VAULT'
    depositCollateral: BigNumber
	depositDai: BigNumber
    bought: BigNumber
}

interface IncreaseMultiplyEvent extends CommonEvent {
    kind: 'INCREASE_MULTIPLY'
    depositCollateral: BigNumber
	depositDai: BigNumber
    bought: BigNumber
}

interface DecreaseMultiplyEvent extends CommonEvent {
    kind: 'DECREASE_MULTIPLY'
    withdrawnCollateral: BigNumber
	withdrawnDai: BigNumber
    sold: BigNumber
}

interface CloseVaultToDaiEvent extends CommonEvent {
    kind: 'CLOSE_VAULT_TO_DAI'
    sold: BigNumber
    exitDai: BigNumber
}

interface CloseVaultToCollateralEvent extends CommonEvent {
    kind: 'CLOSE_VAULT_TO_COLLATERAL'
    sold: BigNumber
    exitCollateral: BigNumber,
}

export type MultiplyEvent = 
    | OpenMultiplyEvent
    | IncreaseMultiplyEvent
    | DecreaseMultiplyEvent
    | CloseVaultToDaiEvent
    | CloseVaultToCollateralEvent

export type MultiplyMethods = 
    | 'openMultiplyVault'
    | 'increaseMultiple'
    | 'decreaseMultiple'
    | 'openMultiplyVault'
    | 'closeVaultExitCollateral'
    | 'closeVaultExitDai'

export interface MultiplyDbEvent {
    id: number,
    method_name: MultiplyMethods,
    cdp_id: string,
    ilk: string,
    liquidation_ratio: number,
    swap_min_amount: number,
    swap_optimist_amount: number,
    collateral_left: 0,
    dai_left: number,
    borrowed: number,
    due: number,
    asset_in: string,
    asset_out: string,
    amount_in: number,
    amount_out: number,
    beneficiary: string,
    amount: number,
    minimum_possible: number,
    urn: string
    actual_amount: number,

    log_index: number,
    tx_id: number,
    block_id: number,
}

const buyingCollateralEvents = ['OPEN_MULTIPLY_VAULT','INCREASE_MULTIPLY'] as const
export function isBuyingCollateral(event: MultiplyEvent): event is FilterByKind<MultiplyEvent, (typeof buyingCollateralEvents)[number]> {
	return buyingCollateralEvents.includes(event.kind as any)
}

/*

const closeToDai = 
	{
		"id": 4,
		"method_name": "closeVaultExitDai",
		"cdp_id": "25558",
		"ilk": "ETH-A",
		"liquidation_ratio": 1.45,
		"swap_min_amount": 30393222727304449992871,
		"swap_optimist_amount": 30545952489753216073237,
		"collateral_left": 0,
		"dai_left": 19228110656020641665286,
		"log_index": 424,
		"tx_id": 1197065,
		"block_id": 4249860,
		"id": 4,
		"borrowed": 11246627963585840719158,
		"due": 11256749928753067975805,
		"log_index": 397,
		"tx_id": 1197065,
		"block_id": 4249860,
		"id": 4,
		"asset_in": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
		"asset_out": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
		"amount_in": 7832076254337518442,
		"amount_out": 30545952489753216073237,
		"log_index": 419,
		"tx_id": 1197065,
		"block_id": 4249860,
		"id": 4,
		"beneficiary": "0xC7b548AD9Cf38721810246C079b2d8083aba8909",
		"amount": 61091904979506432146,
		"log_index": 421,
		"tx_id": 1197065,
		"block_id": 4249860,
		"id": 4,
		"minimum_possible": 30393222727304449992871,
		"actual_amount": 30545952489753216073237,
		"log_index": 418,
		"tx_id": 1197065,
		"block_id": 4249860,
		"urn": "0x82242c6fb04b75adcc022b4df0b634744d48bc18"
	}


const decreaseMultiple = 
	{
		"id": 3,
		"method_name": "decreaseMultiple",
		"cdp_id": "25558",
		"ilk": "ETH-A",
		"liquidation_ratio": 1.45,
		"swap_min_amount": 8489028036329727012892,
		"swap_optimist_amount": 8531686468673092475268,
		"collateral_left": 34,
		"dai_left": 42523909241109004942,
		"log_index": 142,
		"tx_id": 1197061,
		"block_id": 4249848,
		// "id": 3,
		"borrowed": 8531686468673092475268,
		"due": 8539364986494898258495,
		// "log_index": 116,
		// "tx_id": 1197061,
		// "block_id": 4249848,
		// "id": 3,
		"asset_in": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
		"asset_out": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
		"amount_in": 2209864196617973348,
		"amount_out": 8599087069875758780998,
		// "log_index": 137,
		// "tx_id": 1197061,
		// "block_id": 4249848,
		// "id": 3,
		"beneficiary": "0xC7b548AD9Cf38721810246C079b2d8083aba8909",
		"amount": 17198174139751517561,
		// "log_index": 139,
		// "tx_id": 1197061,
		// "block_id": 4249848,
		// "id": 3,
		"minimum_possible": 8539364986494898258495,
		"actual_amount": 8599087069875758780998,
		// "log_index": 136,
		// "tx_id": 1197061,
		// "block_id": 4249848,
		"urn": "0x82242c6fb04b75adcc022b4df0b634744d48bc18"
	}


const openMultiplyEvent = 
	{
		"id": 1,
		"method_name": "openMultiplyVault",
		"cdp_id": "25553",
		"ilk": "ETH-A",
		"liquidation_ratio": 1.45,
		"swap_min_amount": 4870825268060935382,
		"swap_optimist_amount": 4895301776945663700,
		"collateral_left": 0,
		"dai_left": 2829,
		"log_index": 183,
		"tx_id": 1197014,
		"block_id": 4249216,
		// "id": 1,
		"borrowed": 19520309268166785042984,
		// "due": 19537877546508135149522,
		// "log_index": 154,
		// "tx_id": 1197014,
		// "block_id": 4249216,
		// "id": 1,
		"asset_in": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
		"asset_out": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
		"amount_in": 19481268649630451472899,
		"amount_out": 4919778285830392018,
		// "log_index": 166,
		// "tx_id": 1197014,
		// "block_id": 4249216,
		// "id": 1,
		"beneficiary": "0xC7b548AD9Cf38721810246C079b2d8083aba8909",
		"amount": 39040618536333570085,
		// "log_index": 158,
		// "tx_id": 1197014,
		// "block_id": 4249216,
		// "id": 1,
		"minimum_possible": 4870825268060935382,
		"actual_amount": 4919778285830392018,
		// "log_index": 165,
		// "tx_id": 1197014,
		// "block_id": 4249216,
		"urn": "0xfdd3c93b4d67014681fe95b874bc3647a93b3295"
	}
    */