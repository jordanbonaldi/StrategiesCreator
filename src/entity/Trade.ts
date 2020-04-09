import { EntryType, TradeTypes } from "./TradeTypes";
import { ExitTypes } from "./ExitTypes";

export default interface Trade {
    entryType: EntryType,
    price: number,
    stoploss: number,
    exitType: ExitTypes,
    type: TradeTypes,
    asset: string,
    timeframe: string,
    uuid?: string,
    exit?: number,
    date?: Date | string,
}