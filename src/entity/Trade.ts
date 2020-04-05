import {EntryType, TradeTypes} from "./TradeTypes";

export default interface Trade {
    entryType: EntryType,
    price: number,
    stoploss: number,
    type: TradeTypes,
    asset: string,
    timeframe: string,
    uuid ?: string,
    exit?: number,
}