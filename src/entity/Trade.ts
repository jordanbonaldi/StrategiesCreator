import {EntryType, TradeTypes} from "./TradeTypes";

export default interface DissociatePotentialTrade {
    entryType: EntryType,
    entry: number,
    stop: number,
    type: TradeTypes,
    asset: string,
    timeframe: string,
    exit?: number,
}