import Strategy, { Persistence, StrategyParams } from "./Strategy";
import { ichimokucloud, reverseIndex } from "@jordanbonaldi/indicatorsapi";
import { CandleModel } from "@jordanbonaldi/binancefetcher";
import { RiskType } from "../entity/BacktestParams";
import Trade from "../entity/Trade";
import { EntryType, TradeTypes } from "../entity/TradeTypes";
import { ExitTypes } from "../entity/ExitTypes";

export class IchimokuInput implements StrategyParams {
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
    entry = {
        entryLongPrice: "11111",
        entryLongChiku: "1110",
        entryShortPrice: "11111",
        entryShortChiku: "1110",
    };
    exit = {
        exitLongPrice: "10001",
        exitLongChiku: "0000",
        exitShortPrice: "10001",
        exitShortChiku: "0000",
    };
    misc = {
        long: true,
        short: true,
    };
}

export interface IchiPersistence extends Persistence {
    value?: number;
}

export default new class IchimokuStrategy extends Strategy<IchimokuInput, IchiPersistence> {
    constructor() {
        super('IchimokuStrategy',
            new IchimokuInput(),
            {
                warm_up: 121,
                equity: 1000,
                riskType: RiskType.PERCENT,
                riskInTrade: 90
            });
    }

    isSameCandle(candle1: CandleModel | undefined, candle2: CandleModel | undefined): boolean {
        if (candle1 === undefined || candle2 === undefined)
            return false;
        else if (candle1.close === candle2.close &&
            candle1.open === candle2.open &&
            candle1.low === candle2.low &&
            candle1.high === candle2.high &&
            candle1.volume === candle2.volume)
            return true;
        return false;
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
    launchStrategy(candles: CandleModel[], trade: Trade | undefined, timeFrame: string, params: IchimokuInput & StrategyParams): Trade {
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

        let entryLongIsCrossTKBull: boolean = params.entry.entryLongPrice[0] === '1' ? isCrossTKBull : true;
        let entryLongIsAboveTenkan: boolean = params.entry.entryLongPrice[1] === '1' ? isAboveTenkan : true;
        let entryLongIsAboveKijun: boolean = params.entry.entryLongPrice[2] === '1' ? isAboveKijun : true;
        let entryLongIsAboveKumo: boolean = params.entry.entryLongPrice[3] === '1' ? isAboveKumo : true;
        let entryLongIsFuturBrigth: boolean = params.entry.entryLongPrice[4] === '1' ? isFuturBright : true;
        let entryLongIsChikuAbovePrice: boolean = params.entry.entryLongChiku[0] === '1' ? isChikuAbovePrice : true;
        let entryLongIsChikuAboveTenkan: boolean = params.entry.entryLongChiku[1] === '1' ? isChikuAboveTenkan : true;
        let entryLongIsChikuAboveKijun: boolean = params.entry.entryLongChiku[2] === '1' ? isChikuAboveKijun : true;
        let entryLongIsChikuAboveKumo: boolean = params.entry.entryLongChiku[3] === '1' ? isChikuAboveKumo : true;

        let exitLongIsCrossTKBear: boolean = params.exit.exitLongPrice[0] === '1' ? isCrossTKBear : false;
        let exitLongIsUnderTenkan: boolean = params.exit.exitLongPrice[1] === '1' ? isUnderTenkan : false;
        let exitLongIsUnderKijun: boolean = params.exit.exitLongPrice[2] === '1' ? isUnderKijun : false;
        let exitLongIsUnderKumo: boolean = params.exit.exitLongPrice[3] === '1' ? !isAboveKumo : false;
        let exitLongIsFuturDark: boolean = params.exit.exitLongPrice[4] === '1' ? isFuturDark : false;
        let exitLongIsChikuUnderPrice: boolean = params.exit.exitLongChiku[0] === '1' ? !isChikuAbovePrice : false;
        let exitLongIsChikuUnderTenkan: boolean = params.exit.exitLongChiku[1] === '1' ? isChikuUnderTenkan : false;
        let exitLongIsChikuUnderKijun: boolean = params.exit.exitLongChiku[2] === '1' ? isChikuUnderKijun : false;
        let exitLongIsChikuUnderKumo: boolean = params.exit.exitLongChiku[3] === '1' ? !isChikuAboveKumo : false;

        let entryShortIsCrossTKBear: boolean = params.entry.entryShortPrice[0] === '1' ? isCrossTKBear : true;
        let entryShortIsUnderTenkan: boolean = params.entry.entryShortPrice[1] === '1' ? isUnderTenkan : true;
        let entryShortIsUnderKijun: boolean = params.entry.entryShortPrice[2] === '1' ? isUnderKijun : true;
        let entryShortIsUnderKumo: boolean = params.entry.entryShortPrice[3] === '1' ? isUnderKumo : true;
        let entryShortIsFuturDark: boolean = params.entry.entryShortPrice[4] === '1' ? isFuturDark : true;
        let entryShortIsChikuUnderPrice: boolean = params.entry.entryShortChiku[0] === '1' ? isChikuUnderPrice : true;
        let entryShortIsChikuUnderTenkan: boolean = params.entry.entryShortChiku[1] === '1' ? isChikuUnderTenkan : true;
        let entryShortIsChikuUnderKijun: boolean = params.entry.entryShortChiku[2] === '1' ? isChikuUnderKijun : true;
        let entryShortIsChikuUnderKumo: boolean = params.entry.entryShortChiku[3] === '1' ? isChikuUnderKumo : true;

        let exitShortIsCrossTKBull: boolean = params.exit.exitShortPrice[0] === '1' ? isCrossTKBull : false;
        let exitShortIsAboveTenkan: boolean = params.exit.exitShortPrice[1] === '1' ? isAboveTenkan : false;
        let exitShortIsAboveKijun: boolean = params.exit.exitShortPrice[2] === '1' ? isAboveKijun : false;
        let exitShortIsAboveKumo: boolean = params.exit.exitShortPrice[3] === '1' ? !isUnderKumo : false;
        let exitShortIsFuturBright: boolean = params.exit.exitShortPrice[4] === '1' ? isFuturBright : false;
        let exitShortIsChikuAbovePrice: boolean = params.exit.exitShortChiku[0] === '1' ? !isChikuUnderPrice : false;
        let exitShortIsChikuAboveTenkan: boolean = params.exit.exitShortChiku[1] === '1' ? isChikuAboveTenkan : false;
        let exitShortIsChikuAboveKijun: boolean = params.exit.exitShortChiku[2] === '1' ? isChikuAboveKijun : false;
        let exitShortIsChikuAboveKumo: boolean = params.exit.exitShortChiku[3] === '1' ? !isChikuUnderKumo : false;

        let entryLongOneCond: boolean = params.entry.entryLongPrice.includes('1') || params.entry.entryLongChiku.includes('1')
        let entryLongCond: boolean = entryLongOneCond && entryLongIsCrossTKBull && entryLongIsAboveTenkan && entryLongIsAboveKijun && entryLongIsAboveKumo && entryLongIsFuturBrigth && entryLongIsChikuAbovePrice && entryLongIsChikuAboveTenkan && entryLongIsChikuAboveKijun && entryLongIsChikuAboveKumo;

        let exitLongOneCond: boolean = params.exit.exitLongPrice.includes('1') || params.exit.exitLongPrice.includes('1')
        let exitLongCond: boolean = exitLongOneCond && (exitLongIsCrossTKBear || exitLongIsUnderTenkan || exitLongIsUnderKijun || exitLongIsUnderKumo || exitLongIsChikuUnderPrice || exitLongIsChikuUnderTenkan || exitLongIsChikuUnderKijun || exitLongIsChikuUnderKumo || exitLongIsFuturDark);
        let stopLossLong: number = params.useStopLoss ? lastCandle.close * (1 - params.stopPercentage / 100) : 0;

        let entryShortOneCond: boolean = params.entry.entryShortPrice.includes('1') || params.entry.entryShortChiku.includes('1')
        let entryshortCond: boolean = entryShortOneCond && entryShortIsCrossTKBear && entryShortIsUnderTenkan && entryShortIsUnderKijun && entryShortIsUnderKumo && entryShortIsFuturDark && entryShortIsChikuUnderPrice && entryShortIsChikuUnderTenkan && entryShortIsChikuUnderKijun && entryShortIsChikuUnderKumo;

        let exitShortOneCond: boolean = params.exit.exitShortPrice.includes('1') || params.exit.exitShortPrice.includes('1')
        let exitShortCond: boolean = exitShortOneCond && (exitShortIsCrossTKBull || exitShortIsAboveTenkan || exitShortIsAboveKijun || exitShortIsAboveKumo || exitShortIsFuturBright || exitShortIsChikuAbovePrice || exitShortIsChikuAboveTenkan || exitShortIsChikuAboveKijun || exitShortIsChikuAboveKumo);
        let stopLossShort: number = params.useStopLoss ? lastCandle.close * (1 + params.stopPercentage / 100) : 0;

        let currentTrade: Trade | undefined = undefined

        if (!trade) {
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
            this.data = this.data === undefined ? { entryCandle: lastCandle } as IchiPersistence & Persistence : {
                ...this.data,
                entryCandle: lastCandle
            };
        }
        else if (this.isSameCandle(this.data?.entryCandle, lastCandle) === false)
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