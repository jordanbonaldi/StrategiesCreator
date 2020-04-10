import Strategy, { Persistence, StrategyParams } from "./Strategy";
import { ichimokucloud, reverseIndex } from "@jordanbonaldi/indicatorsapi";
import { CandleModel } from "@jordanbonaldi/binancefetcher";
import { RiskType } from "../entity/BacktestParams";
import Trade from "../entity/Trade";
import { EntryType, TradeTypes } from "../entity/TradeTypes";
import { ExitTypes } from "../entity/ExitTypes";

export class IchimokuLongInput implements StrategyParams {
    asset = 'BTCUSDT';
    timeframe = ['4h'];
    stopPercentage: number = 5;
    useStopLoss: boolean = true;
    ichimokuInput = {
        conversionPeriod: 10,
        basePeriod: 30,
        spanPeriod: 60,
        displacement: 30
    };
    entryLong = {
        entryPrice: "11111",
        entryChiku: "1110",
    };
    exitLong = {
        exitPrice: "10001",
        exitChiku: "0000",
    };
    entryShort = {
        entryPrice: "11111",
        entryChiku: "1110",
    };
    exitShort = {
        exitPrice: "10001",
        exitChiku: "0000",
    };
    misc = {
        long: true,
        short: true,
    };
}

export default new class IchimokuLongStrategy extends Strategy<IchimokuLongInput, Persistence> {
    constructor() {
        super('IchimokuLongStrategy',
            new IchimokuLongInput(),
            {
                warm_up: 121,
                equity: 1000,
                riskType: RiskType.PERCENT,
                riskInTrade: 90
            });
    }

    /**
     *
     * @param candles Candle Model of type Candle
     *
     * Copy paste the code below inside brackets
     * @param trade possible current trade
     * @param timeFrame
     * @param params params taken
     */
    launchStrategy(candles: CandleModel[], trade: Trade | undefined, timeFrame: string, params: IchimokuLongInput): Trade {
        let lows: number[] = candles.map(c => Number(c.low)).slice(0, -1);
        let highs: number[] = candles.map(c => Number(c.high)).slice(0, -1);
        let myIchi = ichimokucloud({ low: lows, high: highs, conversionPeriod: params.ichimokuInput.conversionPeriod, basePeriod: params.ichimokuInput.basePeriod, displacement: params.ichimokuInput.displacement, spanPeriod: params.ichimokuInput.spanPeriod });

        let liveCandle: CandleModel = reverseIndex(candles);
        let lastCandle: CandleModel = reverseIndex(candles, 1);
        let lagCandle: CandleModel = reverseIndex(candles, params.ichimokuInput.displacement);
        let lastIchi = reverseIndex(myIchi);
        let lagIchi = reverseIndex(myIchi, params.ichimokuInput.displacement);
        let lagLagIchi = reverseIndex(myIchi, params.ichimokuInput.displacement * 2 - 1);
        let kumoMax: number = Math.max(lagIchi.spanA, lagIchi.spanB);
        let kumoMaxPast: number = Math.max(lagLagIchi.spanA, lagLagIchi.spanB);
        let kumoMin: number = Math.min(lagIchi.spanA, lagIchi.spanB);
        let kumoMinPast: number = Math.min(lagLagIchi.spanA, lagLagIchi.spanB);

        let isCrossTKBull: boolean = lastIchi.conversion >= lastIchi.base;
        let isAboveTenkan: boolean = lastCandle.close > lastIchi.conversion;
        let isAboveKijun: boolean = lastCandle.close > lastIchi.base;
        let isAboveKumo: boolean = lastCandle.close > kumoMax;
        let isFuturBright: boolean = lastIchi.spanA >= lastIchi.spanB;
        let isChikuAbovePrice: boolean = lastCandle.close > Math.max(lagCandle.open, lagCandle.close);
        let isChikuAboveTenkan: boolean = lastCandle.close > lagIchi.conversion;
        let isChikuAboveKijun: boolean = lastCandle.close > lagIchi.base;
        let isChikuAboveKumo: boolean = lastCandle.close > kumoMaxPast;

        let isCrossTKBear: boolean = lastIchi.conversion <= lastIchi.base;
        let isUnderTenkan: boolean = lastCandle.close < lastIchi.conversion;
        let isUnderKijun: boolean = lastCandle.close < lastIchi.base;
        let isUnderKumo: boolean = lastCandle.close < kumoMin;
        let isFuturDark: boolean = lastIchi.spanA <= lastIchi.spanB;
        let isChikuUnderPrice: boolean = lastCandle.close < Math.min(lagCandle.open, lagCandle.close);
        let isChikuUnderTenkan: boolean = lastCandle.close < lagIchi.conversion;
        let isChikuUnderKijun: boolean = lastCandle.close < lagIchi.base;
        let isChikuUnderKumo: boolean = lastCandle.close < kumoMinPast;

        let entryLongIsCrossTKBull: boolean = params.entryLong.entryPrice[0] === '1' ? isCrossTKBull : true;
        let entryLongIsAboveTenkan: boolean = params.entryLong.entryPrice[1] === '1' ? isAboveTenkan : true;
        let entryLongIsAboveKijun: boolean = params.entryLong.entryPrice[2] === '1' ? isAboveKijun : true;
        let entryLongIsAboveKumo: boolean = params.entryLong.entryPrice[3] === '1' ? isAboveKumo : true;
        let entryLongIsFuturBrigth: boolean = params.entryLong.entryPrice[4] === '1' ? isFuturBright : true;
        let entryLongIsChikuAbovePrice: boolean = params.entryLong.entryChiku[0] === '1' ? isChikuAbovePrice : true;
        let entryLongIsChikuAboveTenkan: boolean = params.entryLong.entryChiku[1] === '1' ? isChikuAboveTenkan : true;
        let entryLongIsChikuAboveKijun: boolean = params.entryLong.entryChiku[2] === '1' ? isChikuAboveKijun : true;
        let entryLongIsChikuAboveKumo: boolean = params.entryLong.entryChiku[3] === '1' ? isChikuAboveKumo : true;

        let exitLongIsCrossTKBear: boolean = params.exitLong.exitPrice[0] === '1' ? isCrossTKBear : false;
        let exitLongIsUnderTenkan: boolean = params.exitLong.exitPrice[1] === '1' ? isUnderTenkan : false;
        let exitLongIsUnderKijun: boolean = params.exitLong.exitPrice[2] === '1' ? isUnderKijun : false;
        let exitLongIsUnderKumo: boolean = params.exitLong.exitPrice[3] === '1' ? isUnderKumo : false;
        let exitLongIsFuturDark: boolean = params.exitLong.exitPrice[4] === '1' ? isFuturDark : false;
        let exitLongIsChikuUnderPrice: boolean = params.exitLong.exitChiku[0] === '1' ? isChikuUnderPrice : false;
        let exitLongIsChikuUnderTenkan: boolean = params.exitLong.exitChiku[1] === '1' ? isChikuUnderTenkan : false;
        let exitLongIsChikuUnderKijun: boolean = params.exitLong.exitChiku[2] === '1' ? isChikuUnderKijun : false;
        let exitLongIsChikuUnderKumo: boolean = params.exitLong.exitChiku[3] === '1' ? isChikuUnderKumo : false;

        let entryShortIsCrossTKBear: boolean = params.entryShort.entryPrice[0] === '1' ? isCrossTKBear : true;
        let entryShortIsUnderTenkan: boolean = params.entryShort.entryPrice[1] === '1' ? isUnderTenkan : true;
        let entryShortIsUnderKijun: boolean = params.entryShort.entryPrice[2] === '1' ? isUnderKijun : true;
        let entryShortIsUnderKumo: boolean = params.entryShort.entryPrice[3] === '1' ? isUnderKumo : true;
        let entryShortIsFuturDark: boolean = params.entryShort.entryPrice[4] === '1' ? isFuturDark : true;
        let entryShortIsChikuUnderPrice: boolean = params.entryShort.entryChiku[0] === '1' ? isChikuUnderPrice : true;
        let entryShortIsChikuUnderTenkan: boolean = params.entryShort.entryChiku[1] === '1' ? isChikuUnderTenkan : true;
        let entryShortIsChikuUnderKijun: boolean = params.entryShort.entryChiku[2] === '1' ? isChikuUnderKijun : true;
        let entryShortIsChikuUnderKumo: boolean = params.entryShort.entryChiku[3] === '1' ? isChikuUnderKumo : true;

        let exitShortIsCrossTKBull: boolean = params.exitShort.exitPrice[0] === '1' ? isCrossTKBull : false;
        let exitShortIsAboveTenkan: boolean = params.exitShort.exitPrice[1] === '1' ? isAboveTenkan : false;
        let exitShortIsAboveKijun: boolean = params.exitShort.exitPrice[2] === '1' ? isAboveKijun : false;
        let exitShortIsAboveKumo: boolean = params.exitShort.exitPrice[3] === '1' ? isAboveKumo : false;
        let exitShortIsFuturBright: boolean = params.exitShort.exitPrice[4] === '1' ? isFuturBright : false;
        let exitShortIsChikuAbovePrice: boolean = params.exitShort.exitChiku[0] === '1' ? isChikuAbovePrice : false;
        let exitShortIsChikuAboveTenkan: boolean = params.exitShort.exitChiku[1] === '1' ? isChikuAboveTenkan : false;
        let exitShortIsChikuAboveKijun: boolean = params.exitShort.exitChiku[2] === '1' ? isChikuAboveKijun : false;
        let exitShortIsChikuAboveKumo: boolean = params.exitShort.exitChiku[3] === '1' ? isChikuAboveKumo : false;

        let entryLongOneCond: boolean = params.entryLong.entryPrice.includes('1') || params.entryLong.entryChiku.includes('1')
        let entryLongCond: boolean = entryLongOneCond && entryLongIsCrossTKBull && entryLongIsAboveTenkan && entryLongIsAboveKijun && entryLongIsAboveKumo && entryLongIsFuturBrigth && entryLongIsChikuAbovePrice && entryLongIsChikuAboveTenkan && entryLongIsChikuAboveKijun && entryLongIsChikuAboveKumo;

        let exitLongOneCond: boolean = params.exitLong.exitPrice.includes('1') || params.exitLong.exitPrice.includes('1')
        let exitLongCond: boolean = exitLongOneCond && (exitLongIsCrossTKBear || exitLongIsUnderTenkan || exitLongIsUnderKijun || exitLongIsUnderKumo || exitLongIsChikuUnderPrice || exitLongIsChikuUnderTenkan || exitLongIsChikuUnderKijun || exitLongIsChikuUnderKumo || exitLongIsFuturDark);
        let stopLossLong: number = params.useStopLoss ? lastCandle.close * (1 - params.stopPercentage / 100) : 0;

        let entryShortOneCond: boolean = params.entryShort.entryPrice.includes('1') || params.entryShort.entryChiku.includes('1')
        let entryshortCond: boolean = entryShortOneCond && entryShortIsCrossTKBear && entryShortIsUnderTenkan && entryShortIsUnderKijun && entryShortIsUnderKumo && entryShortIsFuturDark && entryShortIsChikuUnderPrice && entryShortIsChikuUnderTenkan && entryShortIsChikuUnderKijun && entryShortIsChikuUnderKumo;

        let exitShortOneCond: boolean = params.exitShort.exitPrice.includes('1') || params.exitShort.exitPrice.includes('1')
        let exitShortCond: boolean = exitShortOneCond && (exitShortIsCrossTKBull || exitShortIsAboveTenkan || exitShortIsAboveKijun || exitShortIsAboveKumo || exitShortIsFuturBright || exitShortIsChikuAbovePrice || exitShortIsChikuAboveTenkan || exitShortIsChikuAboveKijun || exitShortIsChikuAboveKumo);
        let stopLossShort: number = params.useStopLoss ? lastCandle.close * (1 + params.stopPercentage / 100) : 0;

        let currentTrade: Trade | undefined = undefined

        if (!trade)
            currentTrade = (params.misc.long && entryLongCond && !exitLongCond) || (params.misc.short && entryshortCond && !exitShortCond) ? {
                entryType: EntryType.ENTRY,
                type: entryLongCond ? TradeTypes.LONG : TradeTypes.SHORT,
                price: lastCandle.close,
                stoploss: entryLongCond ? stopLossLong : stopLossShort,
                exitType: ExitTypes.PROFIT,
                asset: this.defaultParams.asset,
                timeframe: timeFrame,
                date: new Date()
            } : undefined;
        else
            currentTrade = trade.type === TradeTypes.LONG ? (
                params.useStopLoss && trade.stoploss > lastCandle.low ? { //liveCandle.close
                    entryType: EntryType.EXIT,
                    type: TradeTypes.LONG,
                    price: trade.stoploss, //liveCandle.close
                    stoploss: 0,
                    exitType: ExitTypes.STOPLOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                    date: new Date()
                } : exitLongCond ? {
                    entryType: EntryType.EXIT,
                    type: TradeTypes.LONG,
                    price: lastCandle.close,
                    stoploss: 0,
                    exitType: trade.price < lastCandle.close ? ExitTypes.PROFIT : ExitTypes.LOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                    date: new Date()
                } : undefined
            ) : trade.type === TradeTypes.SHORT ? (
                params.useStopLoss && trade.stoploss < lastCandle.high ? { //liveCandle.close
                    entryType: EntryType.EXIT,
                    type: TradeTypes.SHORT,
                    price: trade.stoploss, //liveCandle.close
                    stoploss: 0,
                    exitType: ExitTypes.STOPLOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                    date: new Date()
                } : exitShortCond ? {
                    entryType: EntryType.EXIT,
                    type: TradeTypes.SHORT,
                    price: lastCandle.close,
                    stoploss: 0,
                    exitType: trade.price > lastCandle.close ? ExitTypes.PROFIT : ExitTypes.LOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                    date: new Date()
                } : undefined
            ) : undefined;

        return currentTrade ? currentTrade : {
            entryType: EntryType.NOTHING,
            type: TradeTypes.LONG,
            price: 0,
            stoploss: 0,
            exitType: ExitTypes.PROFIT,
            asset: this.defaultParams.asset,
            timeframe: timeFrame,
            date: new Date()
        }
    }
}