import { Trade } from "@jordanbonaldi/indicatorsapi"

export enum TradeStatus {
    WIN = 'Win', LOST = 'Lost', BREAKEVEN = 'Break Even'
}
export default interface TradeResult {
    entryTrade: Trade,
    exitTrade: Trade,
    tradeStatus: TradeStatus,
    pricePercent: number,
    riskRewardRation?: number,
}
