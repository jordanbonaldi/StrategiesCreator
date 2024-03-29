import Trade from "./Trade";

export enum TradeStatus {
    WIN = 'Win', LOST = 'Lost', BREAK_EVEN = 'Break Even'
}

export default interface TradeResult {
    entryTrade: Trade,
    exitTrade: Trade,
    tradeStatus: TradeStatus,
    pricePercent: number,
    riskRewardRation?: number,
}
