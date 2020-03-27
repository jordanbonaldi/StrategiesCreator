import TradeResult from "./TradeResult";

export default interface StrategyResult {
    total: number,
    win: number,
    lost: number,
    equityPercent: number,
    maxDrawDown: number,
    maxLosingStreak: number,
    tradeResults: TradeResult[],
    riskRewardRatio?: number,
    asset: string,
    timeframe: string | string[]
}