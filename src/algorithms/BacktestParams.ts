export enum RiskType {
    PERCENT = 'Percent', FIXEDAMOUNT = 'Fixed Amount'
}

export default interface BacktestParams {
    equity: number,
    riskType: RiskType,
    riskInTrade: number,
    warmup: number;
}