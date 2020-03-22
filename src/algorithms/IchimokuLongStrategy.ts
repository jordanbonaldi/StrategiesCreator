import Strategy, { StrategyParams } from "./Strategy";
import { EntryType, reverseIndex, ichimokucloud, Trade, TradeTypes, IchimokuCloud } from "@jordanbonaldi/indicatorsapi";
import { CandleModel } from "@jordanbonaldi/binancefetcher";
import StrategyResult from "./StrategyResult";
import TradeResult, { TradeStatus } from "./TradeResult";
import BacktestParams, { RiskType } from "./BacktestParams";

export interface IchimokuLongInput extends StrategyParams {
    ichimokuInput: {
        conversionPeriod: number;
        basePeriod: number;
        spanPeriod: number;
        displacement: number;
    },
    entry: {
        entryCrossTKBull: boolean;
        entryPriceAboveKijun: boolean;
        entryPriceAboveTenkan: boolean;
        entryPriceAboveKumo: boolean;
        entryChikuAboveAll: boolean;
        entryFuturBright: boolean;
    },
    exit: {
        exitCrossTKBear: boolean;
        exitPriceUnderKijun: boolean;
        exitPriceUnderTenkan: boolean;
        exitPriceUnderKumo: boolean;
        exitChikuUnderSmthg: boolean;
        exitFuturDark: boolean;
        useStopLoss: boolean;
        stopPerc: number;
    },
    misc: {
        long: boolean,
        short: boolean,
    }
}

export default new class IchimokuLongStrategy extends Strategy<IchimokuLongInput> {
    constructor() {
        super('IchimokuLongStrategy', {
            ichimokuInput: {
                conversionPeriod: 9,
                basePeriod: 26,
                spanPeriod: 52,
                displacement: 26
            },
            entry: {
                entryCrossTKBull: true,
                entryPriceAboveTenkan: false,
                entryPriceAboveKijun: true,
                entryPriceAboveKumo: true,
                entryChikuAboveAll: true,
                entryFuturBright: true,
            },
            exit: {
                exitCrossTKBear: false,
                exitPriceUnderTenkan: false,
                exitPriceUnderKijun: true,
                exitPriceUnderKumo: false,
                exitChikuUnderSmthg: false,
                exitFuturDark: false,
                useStopLoss: true,
                stopPerc: 1
            },
            misc: {
                long: true,
                short: false,
            }
        },
            {
                warmup: 120,
                equity: 1000,
                riskType: RiskType.PERCENT,
                riskInTrade: 10
            });
    }

    tradeResultCalc(entryTrade: Trade, exitTrade: Trade): TradeResult {
        return {
            entryTrade: entryTrade,
            exitTrade: exitTrade,
            pricePercent: ((exitTrade.price - entryTrade.price) / entryTrade.price * 100),
            tradeStatus: entryTrade.price < exitTrade.price ? TradeStatus.WIN : entryTrade.price > exitTrade.price ? TradeStatus.LOST : TradeStatus.BREAKEVEN,
        };
    }

    backtest(candles: CandleModel[], assetDetail: string, assetTimeFrame: string, backtestParams: BacktestParams, params: IchimokuLongInput): StrategyResult {
        let strategyResult: StrategyResult = { total: 0, win: 0, lost: 0, equityPercent: 100, maxDrowDown: 0, maxLosingStreak: 0, tradeResults: [] };
        let tradeResult: TradeResult;
        let currentTrade: Trade | undefined = undefined, lastTrade = undefined;
        let currentEquity: number = backtestParams.equity, losingstreak = 0, saveEquity = backtestParams.equity, drowDown = 0;

        for (let a = backtestParams.warmup; a < candles.length; a++) {
            currentTrade = this.algorithm(candles.slice(0, a), assetDetail, assetTimeFrame, currentTrade, params);
            if (currentTrade.entryType == EntryType.ENTRY && !lastTrade) {
                lastTrade = currentTrade;
            }
            if (currentTrade.entryType == EntryType.EXIT && lastTrade) {
                tradeResult = this.tradeResultCalc(lastTrade, currentTrade);
                if (backtestParams.riskType == RiskType.PERCENT) {
                    currentEquity += (backtestParams.riskInTrade / 100 * currentEquity) / 100 * tradeResult.pricePercent;
                } else {
                    currentEquity += backtestParams.riskInTrade * (1 + tradeResult.pricePercent / 100);
                }
                tradeResult.tradeStatus == TradeStatus.WIN ? strategyResult.win++ : strategyResult.lost++;
                strategyResult.equityPercent = (currentEquity - backtestParams.equity) / backtestParams.equity * 100;
                strategyResult.total++;
                if (tradeResult.tradeStatus == TradeStatus.LOST && (strategyResult.tradeResults.length == 0 || (strategyResult.tradeResults.length > 0 && strategyResult.tradeResults[strategyResult.tradeResults.length - 1].tradeStatus == TradeStatus.LOST))) {
                    losingstreak++;
                }
                else if (tradeResult.tradeStatus == TradeStatus.WIN) {
                    drowDown = (saveEquity - currentEquity) / saveEquity * 100;
                    strategyResult.maxLosingStreak = losingstreak > strategyResult.maxLosingStreak ? losingstreak : strategyResult.maxLosingStreak;
                    strategyResult.maxDrowDown = drowDown > 0 && drowDown > strategyResult.maxDrowDown ? drowDown : strategyResult.maxDrowDown;
                    losingstreak = 0;
                    drowDown = 0;
                    saveEquity = currentEquity;
                }
                strategyResult.tradeResults.push(tradeResult);
                console.log(currentEquity)
                lastTrade = undefined;
            }
            currentTrade = lastTrade;
        }
        return strategyResult;
    }

    /**
     *
     * @param candles Candle Model of type Candle
     * @param assetDetail Assets name
     * @param assetTimeFrame TimeFrame Used
     *
     * Copy paste the code below inside brackets
     * @param trade possible current trade
     * @param params params taken
     */
    algorithm(candles: CandleModel[], assetDetail: string, assetTimeFrame: string, trade: Trade | undefined, params: IchimokuLongInput): Trade {

        let printDebug: Function = (): void => {
            console.log(reverseIndex(candles, 1));
            console.log(reverseIndex(myIchi, params.ichimokuInput.displacement - 1));
            console.log(reverseIndex(myIchi));
        }

        let lows: number[] = candles.map(c => c.low).slice(0, -1);
        let highs: number[] = candles.map(c => c.high).slice(0, -1);
        let myIchi = ichimokucloud({ low: lows, high: highs, conversionPeriod: params.ichimokuInput.conversionPeriod, basePeriod: params.ichimokuInput.basePeriod, displacement: params.ichimokuInput.displacement, spanPeriod: params.ichimokuInput.spanPeriod });

        let lastCandle: CandleModel = reverseIndex(candles, 1);
        let lagCandle: CandleModel = reverseIndex(candles, params.ichimokuInput.displacement - 1);
        let lastIchi = reverseIndex(myIchi);
        let lagIchi = reverseIndex(myIchi, params.ichimokuInput.displacement - 1);
        let lagLagIchi = reverseIndex(myIchi, params.ichimokuInput.displacement * 2 - 1);

        let isAboveTenkan: boolean = params.entry.entryPriceAboveTenkan ? lastCandle.close > lastIchi.conversion : true;
        let isAboveKijun: boolean = params.entry.entryPriceAboveKijun ? lastCandle.close > lastIchi.base : true;
        let isCrossTKBull: boolean = params.entry.entryCrossTKBull ? lastIchi.conversion > lastIchi.base : true;
        let kumoMax: number = Math.max(lagIchi.spanA, lagIchi.spanB);
        let kumoMaxPast: number = Math.max(lagLagIchi.spanA, lagLagIchi.spanB);
        let isAboveKumo: boolean = params.entry.entryPriceAboveKumo ? lastCandle.close > kumoMax : true;
        let isFuturBright: boolean = params.entry.entryFuturBright ? lagIchi.spanA > lagIchi.spanB : true;
        let tmpChiku: boolean = lastCandle.close > lagCandle.close && lastCandle.close > lagIchi.conversion && lastCandle.close > lagIchi.base && lastCandle.close > kumoMaxPast;
        let isChikuAboveAll: boolean = params.entry.entryChikuAboveAll ? tmpChiku : true;

        let exitIsUnderTenkan: boolean = params.exit.exitPriceUnderTenkan ? lastCandle.close < lastIchi.conversion : true;
        let exitIsUnderKijun: boolean = params.exit.exitPriceUnderKijun ? lastCandle.close < lastIchi.base : true;
        let exitIsCrossTKBear: boolean = params.exit.exitCrossTKBear ? lastIchi.conversion < lastIchi.base : true;
        let exitIsUnderKumo: boolean = params.exit.exitPriceUnderKumo ? lastCandle.close < kumoMax : true;
        let exitIsFuturDark: boolean = params.exit.exitFuturDark ? lagIchi.spanA < lagIchi.spanB : true;
        let exitIsChikuUnderSmthg: boolean = params.exit.exitChikuUnderSmthg ? !tmpChiku : true;

        let entryOneCond: boolean = params.entry.entryCrossTKBull || params.entry.entryPriceAboveTenkan || params.entry.entryPriceAboveKijun || params.entry.entryPriceAboveKumo || params.entry.entryChikuAboveAll || params.entry.entryFuturBright;
        let longCond: boolean = entryOneCond && isCrossTKBull && isAboveKijun && isAboveTenkan && isAboveKumo && isChikuAboveAll && isFuturBright;

        let exitOneCond: boolean = params.exit.exitCrossTKBear || params.exit.exitPriceUnderTenkan || params.exit.exitPriceUnderKijun || params.exit.exitPriceUnderKumo || params.exit.exitChikuUnderSmthg || params.exit.exitFuturDark;
        let exitCond: boolean = exitOneCond && (exitIsCrossTKBear && exitIsUnderTenkan && exitIsUnderKijun && exitIsUnderKumo && exitIsChikuUnderSmthg && exitIsFuturDark);
        let stoploss: number = params.exit.useStopLoss ? lastCandle.close * (1 - params.exit.stopPerc / 100) : 0;

        let currentTrade: Trade | undefined =
            params.misc.long && longCond ? {
                entryType: EntryType.ENTRY,
                type: TradeTypes.LONG,
                price: lastCandle.close,
                stoploss: trade && trade.stoploss > 0 ? trade.stoploss : stoploss,
                asset: assetDetail,
                timeframe: assetTimeFrame,
            } : (exitCond || (trade && lastCandle.close < trade.stoploss)) && trade?.entryType == EntryType.ENTRY ? {
                entryType: EntryType.EXIT,
                type: TradeTypes.LONG,
                price: lastCandle.close < trade.stoploss ? trade.stoploss : lastCandle.close,
                stoploss: 0,
                asset: assetDetail,
                timeframe: assetTimeFrame,
            } : undefined;

        return currentTrade ? currentTrade : {
            entryType: EntryType.NOTHING,
            type: TradeTypes.LONG,
            price: 0,
            stoploss: 0,
            asset: assetDetail,
            timeframe: assetTimeFrame,
        };
    }
}