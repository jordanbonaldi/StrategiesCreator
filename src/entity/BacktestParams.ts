export enum RiskType {
    PERCENT = 'Percent', FIXED_AMOUNT = 'Fixed Amount'
}

export default interface BackTestParams {
    equity: number,
    riskType: RiskType,
    riskInTrade: number,
    warm_up: number;
}