import TradeResult from "./TradeResult";

export default interface StrategyResult {
    total: number,
    win: number,
    lost: number,
    equityPercent: number,
    maxDrowDown: number,
    maxLosingStreak: number,
    tradeResults: TradeResult[],
    riskRewardRatio?: number,
}