import BinanceAlgorithmTests from "./tests/BinanceStrategiesTests";
import StrategyResult from "./entity/StrategyResult";
import { Trade } from ".";

BinanceAlgorithmTests.connect()
    .then(instance => instance.runBacktestOnAsset('IchimokuLongStrategy', {
        asset: 'BTCUSDT',
        timeframe: '4h'
    }).then((trade: any) => console.log(trade)));

